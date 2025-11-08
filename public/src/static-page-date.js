/**
 * Populates the 'last-updated' element with the current date.
 */
document.addEventListener("DOMContentLoaded", () => {
    const dateElement = document.getElementById("last-updated");
    if (dateElement) {
      dateElement.textContent += ` ${new Date().toLocaleDateString("pt-BR")}`;
    }
});
