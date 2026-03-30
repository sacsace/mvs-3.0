const bookingForm = document.getElementById("bookingForm");
const bookingNote = document.getElementById("bookingNote");

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    bookingNote.textContent =
      "Thank you. Our team will confirm availability and contact you shortly.";
    bookingForm.reset();
  });
}
