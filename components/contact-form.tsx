"use client";

import { useState, type FormEvent } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const message = String(form.get("message") ?? "");
    const subject = encodeURIComponent("Orit Tej website inquiry from " + name);
    const body = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email + "\n\n" + message,
    );

    setSent(true);
    window.location.href =
      "mailto:orittej.comments@gmail.com?subject=" + subject + "&body=" + body;
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-row">
        <label>
          Name
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </div>
      <label>
        What would you like to talk about?
        <textarea name="message" rows={6} required />
      </label>
      <div className="contact-form__actions">
        <button className="button button--wine" type="submit">
          Write to us
          <span aria-hidden="true">-&gt;</span>
        </button>
        <p aria-live="polite">
          {sent
            ? "Your email app should open with your message ready."
            : "This opens your email app. We usually reply within a few days."}
        </p>
      </div>
    </form>
  );
}
