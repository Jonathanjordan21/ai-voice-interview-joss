// const chatContainer = document.getElementById("chatContainer")

// const data = sessionStorage.getItem("interviewTranscript")

// if (!data) {
//   chatContainer.innerHTML = "<p style='color:white'>No transcript found.</p>"
// } else {
//   const transcript = JSON.parse(data)

//   console.log(transcript)

//   transcript.forEach(msg => {
//     const div = document.createElement("div")
//     div.classList.add("message", msg.role)
//     div.textContent = msg.content[0].transcript
//     chatContainer.appendChild(div)
//   })
// }


const chatContainer = document.getElementById("chatContainer")
const interviewDate = document.getElementById("interviewDate")
const backBtn = document.getElementById("backBtn")
const rawBtn = document.getElementById("rawBtn")


// Back button
backBtn.addEventListener("click", () => {
  window.location.href = "index.html"
})

rawBtn.addEventListener("click", () => {
  window.location.href = "raw_history.html"
})


// Set date
interviewDate.textContent = new Date().toLocaleString()

const data = sessionStorage.getItem("interviewTranscript")

if (!data) {
  chatContainer.innerHTML =
    "<p style='color:#8696a0'>No transcript found.</p>"
} else {
  const transcript = JSON.parse(data)

  transcript.forEach(msg => {
    const div = document.createElement("div")
    div.classList.add("message", msg.role)
    // div.textContent = msg.content[0].transcript

    div.innerHTML = `
      ${msg.content[0].transcript}
      <div class="timestamp">
        ${new Date().toLocaleTimeString()}
      </div>
    `

    chatContainer.appendChild(div)
  })

  chatContainer.scrollTop = chatContainer.scrollHeight
}
