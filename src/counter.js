// import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { ConsoleSpanExporter } from "@openai/agents"
import { RealtimeAgent, RealtimeSession } from "https://esm.sh/@openai/agents/realtime"
// import dotenv from "dotenv";

// dotenv.config();

let mediaRecorder = null
let recordedChunks = []
let stream = null
let chat_history = []

let AISession = null;

let interviewToken = null;

// const API_BASE_URL = 'https://jonathanjordan21-joss-interview-backend-demo.hf.space'
const API_BASE_URL = 'http://182.23.45.127:7860'

const parts = window.location.pathname.split('/').filter(p => p.trim() !== '');
const interviewId = parts[parts.length - 1];

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const timerElement = document.querySelector(".meeting-time");
let seconds = 0;


if (parts.length != 2) {
  console.error('400 Interview not found');
  const appDiv = document.getElementById('app');
  if (appDiv) appDiv.textContent = '400 Interview not found';
} else {
  async function loadData() {
    try {
      const response = await fetch(`${API_BASE_URL}/interview/${interviewId}`, {
        // headers: {"Authorization": "Bearer " + HF_API_KEY}
      });

      console.log(response);

      if (!response.ok) throw new Error(`${response.status}`);

      const data = await response.json();

    } catch (err) {
      console.error(err);
      console.error(err.message)
      const appDiv = document.getElementById('app');
      if (appDiv) appDiv.textContent = `Error fetching interview: ${err.message}`;
    }
  }

  loadData();
}


// Capture the AI audio stream from the WebRTC connection
let aiAudioStream = null;

const OriginalRTCPeerConnection = window.RTCPeerConnection;

window.RTCPeerConnection = function (...args) {
  const pc = new OriginalRTCPeerConnection(...args);

  // Listen for remote audio tracks (the AI’s voice)
  pc.addEventListener('track', (event) => {
    if (event.track.kind === 'audio' && event.streams.length > 0) {
      aiAudioStream = event.streams[0];
      console.log('✅ AI audio stream captured from RTCPeerConnection');
    }
  });

  return pc;
};

export async function setupCounter(button) {
  let started = false

  button.addEventListener('click', async () => {
    const apiKeyInput = document.querySelector('#apiKeyInput')

    if (started) {
      button.textContent = 'Loading...'

      if (AISession) {
        AISession.close();
        AISession = null;
      }

      // await stopInterview()
      // In the button handler
      console.log("STOP.... WAIT...");
      await stopInterview();
      
      button.textContent = "Start Interview"
      apiKeyInput.style.display = 'block';

      setTimeout(() => {
        window.location.href = "/finished.html"
      }, 1000)
      return
    }

    const apiKey = apiKeyInput.value.trim()

    if (!apiKey) {
      alert('Please input your token')
      apiKeyInput.focus()
      return
    }

    button.textContent = 'Loading...'
    interviewToken = apiKey;

    try {

      console.log("start interviewing....")

      const resp = await fetch(`${API_BASE_URL}/interview/${interviewId}/start_interview`,{
        method: "POST",
        headers: {"Authorization": "Bearer " + interviewToken},
      });

      if (!resp.ok){
        button.textContent = 'Start Interview'
        const detail = (await resp.json())['detail']
        alert(detail)
        console.log(detail)
        return
      }

      if (resp.status == 202) {
        console.log("Redirecting now...");
        setTimeout(() => {
          window.location.href = "/finished.html"
        }, 1500)
        return;
      }
      
      const interviewData = await resp.json()
      
      started = true

      button.textContent = 'Stop Interview';
      apiKeyInput.style.display = 'none';

      setInterval(() => {
        seconds++;
        timerElement.textContent = formatTime(seconds);
      }, 1000);

      await startUserCamera()
      startAIBackground()
      startAIVoiceInterview(interviewData.data.ephemeral_key, interviewData.data.prompt)
      await startInterview()
    
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Request failed. Please try again."
      )
      console.log(err.message)
      return
    }
  })
}


// async function startInterview() {
//   const video = document.getElementById('userVideo')
//   stream = await navigator.mediaDevices.getUserMedia({
//     video: true,
//     audio: true
//   })
//   video.srcObject = stream
//   await startRecording(stream)

// }
async function startInterview() {
  const video = document.getElementById('userVideo');
  const userStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  video.srcObject = userStream;

  // Ensure the AI stream is available
  const aiStream = await new Promise((resolve) => {
    if (window.aiAudioStream) return resolve(window.aiAudioStream);
    const check = setInterval(() => {
      if (window.aiAudioStream) {
        clearInterval(check);
        resolve(window.aiAudioStream);
      }
    }, 100);
  });

  const audioCtx = new AudioContext();
  window.audioCtx = audioCtx;
  const mixer = audioCtx.createMediaStreamDestination();

  audioCtx.createMediaStreamSource(userStream).connect(mixer);
  audioCtx.createMediaStreamSource(aiStream).connect(mixer);

  const recordingStream = new MediaStream();
  userStream.getVideoTracks().forEach(t => recordingStream.addTrack(t));
  mixer.stream.getAudioTracks().forEach(t => recordingStream.addTrack(t));

  await startRecording(recordingStream);
}

async function startRecording(stream) {
  recordedChunks = []
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm'
  })
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data)
    }
  }
  // mediaRecorder.onstop = saveRecording
  // mediaRecorder.onstop = async () => {
  //   try {
  //     console.log(`STOPPING INTERVIEW...`)

  //     const blob = new Blob(recordedChunks, { type: "audio/webm" });
  //     recordedChunks = [];

  //     const formData = new FormData();
  //     formData.append("file", blob, "recording.webm");

  //     const upload_recording = await fetch(`${API_BASE_URL}/interview/${interviewId}/file`, {
  //       method: "POST",
  //       headers: {"Authorization": "Bearer " + interviewToken},
  //       body: formData
  //     })

  //     const recording_data = await upload_recording.json()

  //     const transcriptData = {
  //       transcriptId: recording_data["data"]["datetime"],
  //       date: new Date().toISOString(),
  //       messages: chat_history
  //     }

  //     const res = await fetch(`${API_BASE_URL}/interview/${interviewId}`, {
  //       method: "PATCH",
  //       headers: {
  //         "Authorization": "Bearer " + interviewToken,
  //         "Content-Type": "application/json" 
  //       },
  //       body: JSON.stringify({
  //         transcript:chat_history,
  //         recording_url:recording_data["data"]["url"],
  //         status:"FINISHED",
  //         duration:seconds
  //       }),
  //     })
    
  //     if (!res.ok) {
  //       throw new Error(`Request failed: ${res.status}`)
  //     }
  //   }  catch (e) {
  //     console.error(e);
  //     console.log(e.message);
  //     alert(e.message)
  //   }
  // }
  mediaRecorder.start()
}

function stopRecorder(recorder) {
  return new Promise((resolve) => {
    recorder.addEventListener("stop", resolve, { once: true });
    recorder.stop();
  });
}


// async function stopInterview(session) {
//   if (mediaRecorder && mediaRecorder.state !== 'inactive') {
//     // mediaRecorder.onstop = async () => {
//     //   console.log(`STOPPING INTERVIEW...`)

//     //   const blob = new Blob(recordedChunks, { type: "audio/webm" });
//     //   recordedChunks = [];

//     //   const formData = new FormData();
//     //   formData.append("file", blob, "recording.webm");

//     //   const upload_recording = await fetch(`${API_BASE_URL}/interview/${interviewId}/file`, {
//     //     method: "POST",
//     //     headers: {"Authorization": "Bearer " + interviewToken},
//     //     body: formData
//     //   })

//     //   const recording_data = await upload_recording.json()

//     //   const transcriptData = {
//     //     transcriptId: recording_data["data"]["datetime"],
//     //     date: new Date().toISOString(),
//     //     messages: chat_history
//     //   }

//     //   const res = await fetch(`${API_BASE_URL}/interview/${interviewId}`, {
//     //     method: "PATCH",
//     //     headers: {
//     //       "Authorization": "Bearer " + interviewToken,
//     //       "Content-Type": "application/json" 
//     //     },
//     //     body: JSON.stringify({
//     //       transcript:chat_history,
//     //       recording_url:recording_data["data"]["url"],
//     //       status:"FINISHED",
//     //       duration:seconds
//     //     }),
//     //   })
    
//     //   if (!res.ok) {
//     //     throw new Error(`Request failed: ${res.status}`)
//     //   }
//     // }
//     // mediaRecorder.stop()
//     await stopRecorder(mediaRecorder);

//     console.log(`STOPPING INTERVIEW...`)

//     const blob = new Blob(recordedChunks, { type: "audio/webm" });

//         // Download locally
//     const url = URL.createObjectURL(blob);

//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `interview123_${Date.now()}.webm`;

//     document.body.appendChild(a);
//     a.click();
//     a.remove();

//     setTimeout(() => {
//       URL.revokeObjectURL(url);
//     }, 1000);


//     recordedChunks = [];

//     const formData = new FormData();
//     formData.append("file", blob, "recording.webm");

//     const upload_recording = await fetch(`${API_BASE_URL}/interview/${interviewId}/file`, {
//       method: "POST",
//       headers: {"Authorization": "Bearer " + interviewToken},
//       body: formData
//     })

//     const recording_data = await upload_recording.json()

//     const transcriptData = {
//       transcriptId: recording_data["data"]["datetime"],
//       date: new Date().toISOString(),
//       messages: chat_history
//     }

//     const res = await fetch(`${API_BASE_URL}/interview/${interviewId}`, {
//       method: "PATCH",
//       headers: {
//         "Authorization": "Bearer " + interviewToken,
//         "Content-Type": "application/json" 
//       },
//       body: JSON.stringify({
//         transcript:chat_history,
//         recording_url:recording_data["data"]["url"],
//         status:"FINISHED",
//         duration:seconds
//       }),
//     })
  
//     if (!res.ok) {
//       throw new Error(`Request failed: ${res.status}`)
//     }
  
//     const data = await res.json()
    
//   }

//   if (stream) {
//     stream.getTracks().forEach(track => track.stop())
//   }
// }


async function stopInterview() {
  // Clear the timer
  // if (window.timerInterval) {
  //   clearInterval(window.timerInterval);
  //   window.timerInterval = null;
  // }

  try {
    // 1. Stop the media recorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await stopRecorder(mediaRecorder);

      console.log('STOPPING INTERVIEW...');

      // Correct MIME type
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      recordedChunks = [];

      // // Optional: keep a local download for debugging (remove if not needed)
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `interview_${Date.now()}.webm`;
      // document.body.appendChild(a);
      // a.click();
      // a.remove();
      // setTimeout(() => URL.revokeObjectURL(url), 1000);

      // 2. Upload recording
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      const uploadResponse = await fetch(
        `${API_BASE_URL}/interview/${interviewId}/file`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + interviewToken },
          body: formData,
        }
      );
      if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);
      const recordingData = await uploadResponse.json();

      // 3. Update interview status
      const patchResponse = await fetch(
        `${API_BASE_URL}/interview/${interviewId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer ' + interviewToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: chat_history,
            recording_url: recordingData.data.gcs_url || recordingData.data.local_path,
            status: 'FINISHED',
            duration: seconds,
          }),
        }
      );
      if (!patchResponse.ok) throw new Error(`PATCH failed: ${patchResponse.status}`);
    }
  } catch (err) {
    console.error('Error stopping interview:', err);
    // Optionally show user an error message
  } finally {
    // // 4. Disconnect the AI session
    // if (session && typeof session.disconnect === 'function') {
    //   session.disconnect();
    // }

    // // 5. Close the AudioContext (stops mixed audio processing)
    // if (window.audioCtx && window.audioCtx.state !== 'closed') {
    //   window.audioCtx.close();
    // }

    // // 6. Stop all remaining media tracks (user webcam, etc.)
    // if (stream) {
    //   stream.getTracks().forEach(track => track.stop());
    // }
  }
}


// function saveRecording() {
  // const timestamp = Date.now()
  // const blob = new Blob(recordedChunks, {
  //   type: 'video/webm'
  // })
  // const url = URL.createObjectURL(blob)
  // const a = document.createElement('a')
  // a.href = url
  // a.download = `interview_${timestamp}.webm`
  // a.click()

  // saveInterviewData()

  // URL.revokeObjectURL(url)

  // sessionStorage.setItem(
  //   "interviewTranscript",
  //   JSON.stringify(chat_history)
  // )

// }


// function saveInterviewData(timestamp) {
  // const videoBlob = new Blob(recordedChunks, {
  //   type: 'video/webm'
  // })

  // const videoUrl = URL.createObjectURL(videoBlob)

  // const videoLink = document.createElement('a')
  // videoLink.href = videoUrl
  // videoLink.download = `interview_recording_${timestamp}.webm`
  // videoLink.click()

  // URL.revokeObjectURL(videoUrl)

  // const transcriptData = {
  //   interviewId: timestamp,
  //   date: new Date().toISOString(),
  //   messages: chat_history
  // }

  // const jsonBlob = new Blob(
  //   [JSON.stringify(transcriptData, null, 2)],
  //   { type: "application/json" }
  // )

  // const jsonUrl = URL.createObjectURL(jsonBlob)

  // const jsonLink = document.createElement('a')
  // jsonLink.href = jsonUrl
  // jsonLink.download = `interview_transcript_${timestamp}.json`
  // jsonLink.click()

  // URL.revokeObjectURL(jsonUrl)

  // setTimeout(() => {
  //   window.location.href = "chat_history.html"
  // }, 1500)
// }



async function startAIBackground() {
  const canvas = document.querySelector('#ai-bg')
  if (!canvas) {
    throw new Error('canvas (#ai-bg) not found')
  }
  // const canvas = document.querySelector<HTMLCanvasElement>('#ai-bg')!
  const ctx = canvas.getContext('2d')

  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  let t = 0

  function animate() {
    t += 0.01

    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    )

    gradient.addColorStop(0, `hsl(${t * 50 % 360}, 70%, 45%)`)
    gradient.addColorStop(1, `hsl(${(t * 50 + 120) % 360}, 70%, 45%)`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    requestAnimationFrame(animate)
  }

  animate()
}


async function startUserCamera() {
  const video = document.querySelector('#userVideo')

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  video.srcObject = stream
}


// async function startAIVoiceInterview(key, prompt) {
//   const agent = new RealtimeAgent({
//     name: 'Interviewer',
//     instructions: prompt ? prompt
//     : 'You are AI Agent currently interviewing candidates in Bahasa Indonesia. Ask everything related to their skill',
//   });

//   const session = new RealtimeSession(agent, {"model":"gpt-realtime"});
//   console.log(session);
//   console.log(session._pc);
//   console.log(session.transport);

//   try {
//     await session.connect({
//       // To get this ephemeral key string, you can run the following command or implement the equivalent on the server side:
//       // curl -s -X POST https://api.openai.com/v1/realtime/client_secrets -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d '{"session": {"type": "realtime", "model": "gpt-realtime"}}' | jq .value
//       apiKey: key
//     });
//     // console.log('You are connected!');

//     session.on('history_updated', (history) => {
//       // returns the full history of the session
//       // console.log(`HISTORY UPDATED`);
//       // console.log(history);
//       chat_history = history
//     });

//     // session.on('history_added', (history) => {
//       // console.log(`HISTORY ADDED`)
//       // console.log(history)
//     // })
//   } catch (e) {
//     console.error(e);
//   }
// }


async function startAIVoiceInterview(key, prompt) {
  const agent = new RealtimeAgent({
    name: 'Interviewer',
    instructions: prompt || 'You are AI Agent currently interviewing candidates in Bahasa Indonesia. Ask everything related to their skill',
  });
  const session = new RealtimeSession(agent, { model: 'gpt-realtime' });

  await session.connect({ apiKey: key });
  console.log('AI session connected');

  // Wait for the AI audio stream (captured by our monkey-patch)
  const stream = await new Promise((resolve, reject) => {
    if (aiAudioStream) return resolve(aiAudioStream);
    const start = Date.now();
    const check = setInterval(() => {
      if (aiAudioStream) {
        clearInterval(check);
        resolve(aiAudioStream);
      } else if (Date.now() - start > 15000) {
        clearInterval(check);
        reject(new Error('AI audio stream timed out – no remote track received'));
      }
    }, 100);
  });

  window.aiAudioStream = stream;   // for mixing

  AISession = session;

  session.on('history_updated', (history) => {
    chat_history = history;
  });
}