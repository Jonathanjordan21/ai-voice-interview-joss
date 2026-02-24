// import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { RealtimeAgent, RealtimeSession } from "https://esm.sh/@openai/agents/realtime"
// import dotenv from "dotenv";

// dotenv.config();

let mediaRecorder = null
let recordedChunks = []
let stream = null
let chat_history = []

let interviewToken = null;

const API_BASE_URL = 'https://jonathanjordan21-joss-interview-backend-demo.hf.space'

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

export async function setupCounter(button) {
  let started = false

  button.addEventListener('click', async () => {
    const apiKeyInput = document.querySelector('#apiKeyInput')

    if (started) {
      button.textContent = 'Loading...'

      await stopInterview()
      
      // button.textContent = "Start Interview"
      // apiKeyInput.style.display = 'block';
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


async function startInterview() {
  const video = document.getElementById('userVideo')
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })
  video.srcObject = stream
  await startRecording(stream)

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
  mediaRecorder.start()
}


async function stopInterview(session) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()

    console.log(`STOPPING INTERVIEW...`)

    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    recordedChunks = [];

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    const upload_recording = await fetch(`${API_BASE_URL}/interview/${interviewId}/file`, {
      method: "POST",
      headers: {"Authorization": "Bearer " + interviewToken},
      body: formData
    })

    const recording_data = await upload_recording.json()

    const transcriptData = {
      transcriptId: recording_data["data"]["datetime"],
      date: new Date().toISOString(),
      messages: chat_history
    }

    const res = await fetch(`${API_BASE_URL}/interview/${interviewId}`, {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + interviewToken,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        transcript:chat_history,
        recording_url:recording_data["data"]["url"],
        status:"FINISHED",
        duration:seconds
      }),
    })
  
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
  
    // const data = await res.json()
    
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
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


async function startAIVoiceInterview(key, prompt) {
  const agent = new RealtimeAgent({
    name: 'Interviewer',
    instructions: prompt ? prompt
    : 'You are AI Agent currently interviewing candidates in Bahasa Indonesia. Ask everything related to their skill',
  });

  const session = new RealtimeSession(agent, {"model":"gpt-realtime"});
  try {
    await session.connect({
      // To get this ephemeral key string, you can run the following command or implement the equivalent on the server side:
      // curl -s -X POST https://api.openai.com/v1/realtime/client_secrets -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d '{"session": {"type": "realtime", "model": "gpt-realtime"}}' | jq .value
      apiKey: key
    });
    // console.log('You are connected!');

    session.on('history_updated', (history) => {
      // returns the full history of the session
      // console.log(`HISTORY UPDATED`);
      // console.log(history);
      chat_history = history
    });

    // session.on('history_added', (history) => {
      // console.log(`HISTORY ADDED`)
      // console.log(history)
    // })
  } catch (e) {
    console.error(e);
  }
}
