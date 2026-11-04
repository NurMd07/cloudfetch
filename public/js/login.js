const helpDiv = document.querySelector(".help");
const messageDiv = document.querySelector(".message");

helpDiv.addEventListener("click", () => {
    messageDiv.innerHTML = "";
    messageDiv.innerHTML = `Set and Use <span style="color: #fbff00;">$USERNAME</span>, <span style="color: #fbff00;">$PASSWORD</span> and <span style="color: #fbff00;">$SESSION_SECRET</span> from .env`;
});