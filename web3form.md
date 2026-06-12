

Implementation: Next.js / React Component
Here is a clean, bare-bones implementation using Web3Forms as the handler. This allows you to intercept the submit button, handle it via a standard JavaScript fetch() request, and show a clean "Message Sent!" confirmation card without the page awkwardly refreshing.

JavaScript
import { useState } from 'react';

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    
    // Web3Forms uses an access key instead of a custom URL string
    formData.append("access_key", "YOUR_ACCESS_KEY_HERE"); 

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      setSubmitted(true);
    } else {
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="p-6 text-center bg-gray-900 border border-green-500 rounded-lg">
        <h3 className="text-xl font-bold text-green-400">Message Transmitted!</h3>
        <p className="text-gray-400 mt-2">Thanks for reaching out. I'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-gray-900 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-300">Your Email</label>
        <input 
          type="email" 
          name="email" 
          required 
          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Message</label>
        <textarea 
          name="message" 
          required 
          rows="4" 
          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white p-2"
        ></textarea>
      </div>

      {/* Honeypot Spam Protection (Invisible to real users, but bots will fill it out and get rejected automatically) */}
      <input type="checkbox" name="botcheck" className="hidden" style={{ display: "none" }} />

      <button 
        type="submit" 
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
🛡️ Preventing Spam Bot Torture
The absolute biggest risk of a serverless contact form is automated spam bots crawling your site, filling out your form 500 times, and exhausting your free limits or flooding your inbox.

To combat this without ruining your UI with an annoying, ugly Google reCAPTCHA, implement these two shields:

The Honeypot Element (Built into the code above): Bots read raw HTML code, not visual layouts. By adding an input field named botcheck and hiding it with CSS (display: none), human users will never see it, but a malicious bot will automatically fill it out. Web3Forms and Formspree instantly recognize if that hidden box contains data and silently drop the submission without wasting your monthly limits.

Native Form Validation: Ensure your <input> tags use explicit required flags and type="email". This forces the user's browser to pre-validate the text integrity before a single payload hits your endpoint.

It keeps your static architecture incredibly light, requires no database connections or API routing overhead, and drops user feedback directly into your main mailbox alongside your Lemon Squeezy sale receipts!





Form Access Key
Your unique form id to send form submissions
7ee27a00-4a85-457b-ab9f-30772639f846

This is a public key. You can use it in client side code. Visit Docs

Quick Start Examples
Choose your preferred method and copy the code snippet
HTML
JavaScript
React
<form action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="7ee27a00-4a85-457b-ab9f-30772639f846">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Submit</button>
</form>

Your access key is automatically included in the above code.



EMAIL TO USE --- wayne@mediaq.io