// Optional: Automatically redirect to home after X seconds
const redirectTime = 15; // seconds
let countdown = redirectTime;
const btn = document.querySelector('.btn-home');

const timer = setInterval(() => {
countdown--;
btn.textContent = `Return to Home (${countdown}s)`;
if (countdown <= 0) {
    clearInterval(timer);
    window.location.href = '/';
}}, 1000);