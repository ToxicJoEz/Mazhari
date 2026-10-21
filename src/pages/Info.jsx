import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../context/store';
import { apiRequest } from '../lib/api';
import { Notice } from '../components/UI';
import PageTransition from '../components/PageTransition';
const pages = {
  about: [
    'Our story.',
    'A considered approach to outerwear.',
    'Mazhari is an outerwear label built around expressive silhouettes, distinctive textures and pieces with presence. Explore our collections to find your fit, your color and your next signature.',
  ],
  shipping: [
    'Delivery & store policy.',
    'Across Egypt. Cash on delivery.',
    'We deliver across all 27 Egyptian governorates. Delivery fees are set by governorate and shown before you place your order. If your governorate’s rate is awaiting confirmation, contact us before ordering. Our team will contact you to confirm delivery details before dispatch. Delivery timing is confirmed by the team; no dispatch date is guaranteed at checkout.',
  ],
  'size-guide': [
    'Find your fit.',
    'Every silhouette has its own shape.',
    'Choose the size and color on each product page. Availability is specific to that combination. Product descriptions contain any piece-specific sizing information supplied by our team. If you need measurements or fit advice, contact us with the product name and your preferred size before placing an order.',
  ],
  terms: [
    'Store terms.',
    'A clear understanding, before you order.',
    'Orders are placed in Egyptian pounds and paid in cash on delivery. Your final price includes the product subtotal and the governorate delivery fee displayed at checkout. Orders are subject to stock availability and confirmation by our team. You can cancel a signed-in order while it is pending or confirmed; guest customers should contact support.',
  ],
  privacy: [
    'Your privacy.',
    'The details we need, handled with care.',
    'We store account, address and order information in our database to manage your purchases and provide support. Passwords are stored as hashes. Login tokens stay in this browser tab’s session storage; guest bags and guest tracking keys use local browser storage. Do not share your tracking key: it grants access to the associated order. Contact us for privacy questions or requests relating to your data.',
  ],
};
export default function Info({ page: provided }) {
  const { page: routePage } = useParams();
  const page = provided || routePage;
  const { settings } = useStore();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  if (page === 'contact')
    return (
      <PageTransition className="store-page">
        <header className="page-heading">
          <span className="eyebrow">LET’S TALK</span>
          <h1>Here for you.</h1>
          <p>Fit advice, delivery questions, or a little help with your order.</p>
        </header>
        <div className="contact-layout">
          <section className="panel stack">
            <h2>Get in touch</h2>
            <p>
              Send a message using the form. It goes directly to the Mazhari team’s support inbox.
            </p>
            {settings?.supportEmail && (
              <a className="text-link" href={'mailto:' + settings.supportEmail}>
                {settings.supportEmail}
              </a>
            )}
            {settings?.supportPhone && (
              <a className="text-link" href={'tel:' + settings.supportPhone}>
                {settings.supportPhone}
              </a>
            )}
            {settings?.whatsapp && (
              <a
                className="text-link"
                href={'https://wa.me/' + settings.whatsapp.replace(/\D/g, '')}
                target="_blank"
                rel="noreferrer"
              >
                Chat on WhatsApp
              </a>
            )}
            <Link className="text-link" to="/track">
              Track a guest order
            </Link>
            <Link className="text-link" to="/forgot-password">
              Account password support
            </Link>
          </section>
          <form
            className="panel stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setBusy(true);
              setError('');
              setNotice('');
              try {
                const data = await apiRequest('/contact', {
                  method: 'POST',
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                setNotice(data.message);
                form.reset();
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Name
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Email
              <input name="email" required type="email" />
            </label>
            <label>
              Mobile (optional)
              <input name="mobile" type="tel" />
            </label>
            <label>
              Your message
              <textarea name="message" required maxLength={3000} rows={6} />
            </label>
            <Notice error={error} notice={notice} />
            <button className="btn" disabled={busy}>
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </PageTransition>
    );
  const content = pages[page];
  if (!content) return null;
  return (
    <PageTransition className="store-page narrow">
      <header className="page-heading">
        <span className="eyebrow">MAZHARI / CLIENT SERVICES</span>
        <h1>{content[0]}</h1>
        <p>{content[1]}</p>
      </header>
      <article className="panel prose">
        <p>{content[2]}</p>
        {['shipping', 'terms'].includes(page) && (
          <>
            <h2>Final-sale policy</h2>
            <p>
              All sales are final, subject to applicable consumer rights. If an item is incorrect or
              arrives damaged, contact us promptly with your order number so our team can review the
              issue.
            </p>
            <h2>Order tracking</h2>
            <p>
              Signed-in customers can follow orders in My orders. Guests can use the private
              tracking key shown on the order confirmation page. Cash collection is recorded
              separately from delivery status.
            </p>
          </>
        )}
        <Link className="text-link" to={page === 'about' ? '/shop' : '/contact'}>
          {page === 'about' ? 'Explore the collection' : 'Contact the team'}
        </Link>
      </article>
    </PageTransition>
  );
}
