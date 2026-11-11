const helpDiv = document.querySelector(".help");
const messageDiv = document.querySelector(".message");

helpDiv.addEventListener("click", () => {
    const variables = ["$USERNAME", "$PASSWORD", "$SESSION_SECRET"];
    const message = document.createDocumentFragment();
    message.append("Set and Use ");

    variables.forEach((variable, index) => {
        const variableLabel = document.createElement("span");
        variableLabel.classList.add("env-variable");
        variableLabel.textContent = variable;
        message.append(variableLabel);

        if (index < variables.length - 2) {
            message.append(", ");
        } else if (index === variables.length - 2) {
            message.append(" and ");
        }
    });

    message.append(" from .env");
    messageDiv.replaceChildren(message);
});