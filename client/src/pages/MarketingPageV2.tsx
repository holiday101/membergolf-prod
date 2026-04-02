import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const FEATURED_COURSES = [
  { id: 3, name: "Birch Creek Golf Course" },
  { id: 27, name: "Cedar Ridge Golf Course" },
  { id: 29, name: "Cove View Golf Course" },
  { id: 33, name: "Gladstan Golf Course" },
];

export default function MarketingPageV2() {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [courseLogos, setCourseLogos] = useState<Array<{ id: number; name: string; logoUrl: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const results = await Promise.all(
        FEATURED_COURSES.map(async (c) => {
          try {
            const res = await fetch(`/api/public/${c.id}/course`);
            if (!res.ok) return { id: c.id, name: c.name, logoUrl: null };
            const data = await res.json();
            return {
              id: c.id,
              name: data.coursename ?? c.name,
              logoUrl: data.logo_url ?? null,
            };
          } catch {
            return { id: c.id, name: c.name, logoUrl: null };
          }
        })
      );
      setCourseLogos(results);
    })();
  }, []);

  // SEO meta tags
  useEffect(() => {
    const title = "Golf League Management Software | Member Golf Online";
    const description =
      "Run your men's golf association in one place — events, handicaps, payouts, and standings. More participation, more revenue, zero spreadsheets.";
    const url = "https://membergolfonline.com";

    document.title = title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", url, "property");
    setMeta("og:image", `${url}/og-image.png`, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    return () => {
      document.title = "Member Golf Online";
    };
  }, []);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          course: course.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const faqs = [
    {
      q: "How are handicaps calculated?",
      a: "Handicaps are computed using only scores from league events. This prevents sandbagging and ensures fair competition every week.",
    },
    {
      q: "Can members see their own stats?",
      a: "Yes. Every league gets a public website where members can view the money list, upcoming events, scores, and individual member profiles from any device.",
    },
    {
      q: "How do sponsorships work?",
      a: "Local businesses can have their logo and link displayed on your league's public website. You set the pricing and keep the revenue — it's a new income stream with zero overhead.",
    },
    {
      q: "What formats do you support?",
      a: "Stroke play, stroke net, best ball, skins, net skins, and more. New formats are added regularly based on what courses need.",
    },
    {
      q: "How long does setup take?",
      a: "Most courses are up and running within a day. We handle the initial configuration for you.",
    },
    {
      q: "Is there a contract?",
      a: "No long-term contracts. Pay per season and cancel anytime.",
    },
  ];

  return (
    <div className="v2Marketing">
      {/* ── Nav ── */}
      <nav className="v2Nav">
        <div className="v2NavInner">
          <div className="v2NavBrand">
            <svg viewBox="0 0 120 120" aria-hidden="true" className="v2NavMark">
              <defs>
                <linearGradient id="v2-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0b3d2e" />
                  <stop offset="100%" stopColor="#1f8a5b" />
                </linearGradient>
              </defs>
              <path
                d="M60 10c22 0 40 8 40 24v28c0 26-19 44-40 48-21-4-40-22-40-48V34c0-16 18-24 40-24Z"
                fill="url(#v2-grad)"
              />
              <path
                d="M60 18c-18 0-32 6-32 18v26c0 22 16 37 32 40 16-3 32-18 32-40V36c0-12-14-18-32-18Z"
                fill="#f8fafc"
              />
              <path d="M46 72c8 6 20 6 28 0" stroke="#14532d" strokeWidth="4" strokeLinecap="round" />
              <circle cx="60" cy="76" r="3.5" fill="#0f172a" />
              <line x1="60" y1="32" x2="60" y2="68" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              <path d="M60 34 L84 40 L60 48 Z" fill="#dc2626" />
              <path d="M40 88c6 8 14 12 20 12s14-4 20-12" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <span className="v2NavName fontBrand">Member Golf Online</span>
          </div>
          <div className="v2NavActions">
            <Link className="v2NavLogin" to="/login">Login</Link>
            <button className="v2PrimaryBtn" onClick={() => scrollTo("cta-final")}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header id="hero" className="v2Hero">
        <div className="v2HeroOverlay" />
        <div className="v2Container v2HeroContent">
          <h1>Turn Your Men's League Into a Revenue Engine</h1>
          <p className="v2HeroSub">
            Member Golf Online gives your golf course the tools to run a thriving men's association — more participation, more revenue, zero spreadsheets.
          </p>
          <div className="v2HeroActions">
            <button className="v2PrimaryBtn v2BtnLg" onClick={() => scrollTo("cta-final")}>Schedule a Demo</button>
            <button className="v2HeroSecondary v2BtnLg" onClick={() => scrollTo("how-it-works")}>See How It Works</button>
          </div>
        </div>
      </header>

      {/* ── Problems ── */}
      <section id="problems" className="v2Problems">
        <div className="v2Container">
          <h2 className="v2SectionTitle">Sound Familiar?</h2>
          <div className="v2ProblemGrid">
            <div className="v2ProblemCard">
              <svg viewBox="0 0 48 48" className="v2Icon"><circle cx="24" cy="24" r="16" fill="none" stroke="#1f8a5b" strokeWidth="2.5" /><line x1="24" y1="14" x2="24" y2="24" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" /><line x1="24" y1="24" x2="32" y2="28" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" /></svg>
              <h3>Hours Lost Crunching Numbers</h3>
              <p>You're spending hours after every event calculating payouts by hand — and once the cash is handed out, there's no record to pull up if someone has a question.</p>
            </div>
            <div className="v2ProblemCard">
              <svg viewBox="0 0 48 48" className="v2Icon"><circle cx="24" cy="24" r="16" fill="none" stroke="#1f8a5b" strokeWidth="2.5" /><text x="24" y="29" textAnchor="middle" fontSize="18" fill="#1f8a5b" fontWeight="700">?</text></svg>
              <h3>Members Don't Know If They Won</h3>
              <p>Results take days to post. Members lose interest and stop showing up week after week.</p>
            </div>
            <div className="v2ProblemCard">
              <svg viewBox="0 0 48 48" className="v2Icon"><path d="M12 36 L12 20 L20 20 L20 36 Z" fill="none" stroke="#1f8a5b" strokeWidth="2.5" /><path d="M20 36 L20 14 L28 14 L28 36 Z" fill="none" stroke="#1f8a5b" strokeWidth="2.5" /><path d="M28 36 L28 24 L36 24 L36 36 Z" fill="none" stroke="#1f8a5b" strokeWidth="2.5" /><line x1="8" y1="36" x2="40" y2="36" stroke="#1f8a5b" strokeWidth="2.5" /><line x1="10" y1="12" x2="38" y2="12" stroke="#1f8a5b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" /></svg>
              <h3>Revenue Is Flat</h3>
              <p>Your men's league could be driving more green-fee revenue and pro shop traffic, but participation is stagnant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section id="benefits" className="v2Benefits">
        <div className="v2Container">
          <h2 className="v2SectionTitle">What Changes When You Switch</h2>
          <p className="v2SectionSub">Five reasons courses choose Member Golf Online</p>
          <div className="v2BenefitGrid">
            <div className="v2BenefitCard">
              <svg viewBox="0 0 48 48" className="v2BenefitIcon"><circle cx="24" cy="24" r="20" fill="#edf7ea" /><circle cx="24" cy="24" r="11" fill="none" stroke="#1f8a5b" strokeWidth="2" /><text x="24" y="29" textAnchor="middle" fontSize="16" fill="#1f8a5b" fontWeight="700">$</text></svg>
              <h3>Increase Revenue From Your League</h3>
              <p>More engaged members means more rounds, more green fees, and more pro shop purchases every week.</p>
            </div>
            <div className="v2BenefitCard">
              <svg viewBox="0 0 48 48" className="v2BenefitIcon"><circle cx="24" cy="24" r="20" fill="#edf7ea" /><path d="M14 20 L14 28 L22 28 L22 20 Z" fill="none" stroke="#1f8a5b" strokeWidth="2" strokeLinejoin="round" /><path d="M22 21 L34 16 L34 32 L22 27" fill="none" stroke="#1f8a5b" strokeWidth="2" strokeLinejoin="round" /><line x1="18" y1="28" x2="18" y2="34" stroke="#1f8a5b" strokeWidth="2" strokeLinecap="round" /></svg>
              <h3>Sell Sponsorships to Local Businesses</h3>
              <p>Your league's public website includes sponsorship placement. Local businesses pay to reach your most active golfers.</p>
            </div>
            <div className="v2BenefitCard">
              <svg viewBox="0 0 48 48" className="v2BenefitIcon"><circle cx="24" cy="24" r="20" fill="#edf7ea" /><path d="M27 12 L19 26 L25 26 L21 36 L33 22 L26 22 L30 12 Z" fill="#1f8a5b" /></svg>
              <h3>Post Winnings Instantly</h3>
              <p>Scores go in, winnings come out. Members see exactly what they won before they leave the clubhouse.</p>
            </div>
            <div className="v2BenefitCard">
              <svg viewBox="0 0 48 48" className="v2BenefitIcon"><circle cx="24" cy="24" r="20" fill="#edf7ea" /><circle cx="24" cy="20" r="8" fill="none" stroke="#1f8a5b" strokeWidth="2" /><path d="M18 27 L14 36 L20 33 L24 38 L28 33 L34 36 L30 27" fill="none" stroke="#1f8a5b" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              <h3>Season-Long Money List</h3>
              <p>A running total of every member's season earnings, visible to everyone. It drives competition and keeps members coming back.</p>
            </div>
            <div className="v2BenefitCard">
              <svg viewBox="0 0 48 48" className="v2BenefitIcon"><circle cx="24" cy="24" r="20" fill="#edf7ea" /><path d="M24 12 C16 12 14 16 14 20 C14 30 24 36 24 36 C24 36 34 30 34 20 C34 16 32 12 24 12 Z" fill="none" stroke="#1f8a5b" strokeWidth="2" strokeLinejoin="round" /><path d="M20 24 L23 27 L29 20" fill="none" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <h3>Honest Handicaps — No Sandbagging</h3>
              <p>Handicaps are calculated exclusively from scores posted within your league. No outside rounds, no gaming the system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Showcase ── */}
      <section id="showcase" className="v2Showcase">
        <div className="v2Container">
          <h2 className="v2SectionTitle">See It in Action</h2>
          <p className="v2SectionSub">Every league gets its own public website — accessible to all members from any device</p>
          <div className="v2ShowcaseGrid">
            <div className="v2ShowcaseItem">
              <div className="v2BrowserFrame v2BrowserSm">
                <div className="v2BrowserBar">
                  <span className="v2Dot v2DotRed" /><span className="v2Dot v2DotYellow" /><span className="v2Dot v2DotGreen" />
                </div>
                <svg viewBox="0 0 320 200" className="v2MockSvg">
                  <rect width="320" height="200" fill="#f8fafc" />
                  <rect x="20" y="12" width="280" height="28" rx="6" fill="#1f8a5b" />
                  <text x="160" y="31" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">SEASON MONEY LIST</text>
                  <g fontSize="11" fill="#0f172a">
                    <text x="32" y="60">1. Earl Baker</text><text x="288" y="60" textAnchor="end" fontWeight="600" fill="#1f8a5b">$1,572</text>
                    <line x1="32" y1="68" x2="288" y2="68" stroke="#e2e8f0" />
                    <text x="32" y="84">2. Bubba Simmons</text><text x="288" y="84" textAnchor="end" fontWeight="600" fill="#1f8a5b">$420</text>
                    <line x1="32" y1="92" x2="288" y2="92" stroke="#e2e8f0" />
                    <text x="32" y="108">3. Cletus Miller</text><text x="288" y="108" textAnchor="end" fontWeight="600" fill="#1f8a5b">$220</text>
                    <line x1="32" y1="116" x2="288" y2="116" stroke="#e2e8f0" />
                    <text x="32" y="132">4. Tommy Jenkins</text><text x="288" y="132" textAnchor="end" fontWeight="600" fill="#1f8a5b">$185</text>
                    <line x1="32" y1="140" x2="288" y2="140" stroke="#e2e8f0" />
                    <text x="32" y="156">5. Big Jim Callaway</text><text x="288" y="156" textAnchor="end" fontWeight="600" fill="#1f8a5b">$142</text>
                  </g>
                </svg>
              </div>
              <p className="v2ShowcaseCaption">Season money list — always up to date</p>
            </div>

            <div className="v2ShowcaseItem">
              <div className="v2BrowserFrame v2BrowserSm">
                <div className="v2BrowserBar">
                  <span className="v2Dot v2DotRed" /><span className="v2Dot v2DotYellow" /><span className="v2Dot v2DotGreen" />
                </div>
                <svg viewBox="0 0 320 200" className="v2MockSvg">
                  <rect width="320" height="200" fill="#f8fafc" />
                  <rect x="20" y="12" width="280" height="28" rx="6" fill="#1f8a5b" />
                  <text x="160" y="31" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">EVENT RESULTS — MAY 14</text>
                  <g fontSize="10" fill="#64748b" fontWeight="600">
                    <text x="32" y="58">PLAYER</text><text x="170" y="58">GROSS</text><text x="210" y="58">NET</text><text x="260" y="58" textAnchor="end">WON</text>
                  </g>
                  <g fontSize="11" fill="#0f172a">
                    <text x="32" y="78">Earl Baker</text><text x="176" y="78">72</text><text x="214" y="78">68</text><text x="260" y="78" textAnchor="end" fill="#1f8a5b" fontWeight="600">$85</text>
                    <line x1="32" y1="86" x2="288" y2="86" stroke="#e2e8f0" />
                    <text x="32" y="102">Bubba Simmons</text><text x="176" y="102">78</text><text x="214" y="102">70</text><text x="260" y="102" textAnchor="end" fill="#1f8a5b" fontWeight="600">$60</text>
                    <line x1="32" y1="110" x2="288" y2="110" stroke="#e2e8f0" />
                    <text x="32" y="126">Cletus Miller</text><text x="176" y="126">80</text><text x="214" y="126">71</text><text x="260" y="126" textAnchor="end" fill="#1f8a5b" fontWeight="600">$40</text>
                    <line x1="32" y1="134" x2="288" y2="134" stroke="#e2e8f0" />
                    <text x="32" y="150">Tommy Jenkins</text><text x="176" y="150">82</text><text x="214" y="150">73</text><text x="260" y="150" textAnchor="end" fill="#1f8a5b" fontWeight="600">$25</text>
                  </g>
                </svg>
              </div>
              <p className="v2ShowcaseCaption">Scores and winnings posted instantly</p>
            </div>

            <div className="v2ShowcaseItem">
              <div className="v2BrowserFrame v2BrowserSm">
                <div className="v2BrowserBar">
                  <span className="v2Dot v2DotRed" /><span className="v2Dot v2DotYellow" /><span className="v2Dot v2DotGreen" />
                </div>
                <svg viewBox="0 0 320 200" className="v2MockSvg">
                  <rect width="320" height="200" fill="#f8fafc" />
                  <rect x="20" y="12" width="280" height="28" rx="6" fill="#1f8a5b" />
                  <text x="160" y="31" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">MAY 2026</text>
                  <g fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="600">
                    <text x="52" y="58">SUN</text><text x="92" y="58">MON</text><text x="132" y="58">TUE</text>
                    <text x="172" y="58">WED</text><text x="212" y="58">THU</text><text x="252" y="58">FRI</text><text x="292" y="58">SAT</text>
                  </g>
                  <g fontSize="11" fill="#0f172a" textAnchor="middle">
                    <text x="252" y="80">1</text><text x="292" y="80">2</text>
                    <text x="52" y="100">3</text><text x="92" y="100">4</text><text x="132" y="100">5</text>
                    <text x="172" y="100" fontWeight="700" fill="#1f8a5b">6</text><circle cx="172" cy="105" r="3" fill="#1f8a5b" />
                    <text x="212" y="100">7</text><text x="252" y="100">8</text><text x="292" y="100">9</text>
                    <text x="52" y="120">10</text><text x="92" y="120">11</text><text x="132" y="120">12</text>
                    <text x="172" y="120" fontWeight="700" fill="#1f8a5b">13</text><circle cx="172" cy="125" r="3" fill="#1f8a5b" />
                    <text x="212" y="120">14</text><text x="252" y="120">15</text><text x="292" y="120">16</text>
                    <text x="52" y="140">17</text><text x="92" y="140">18</text><text x="132" y="140">19</text>
                    <text x="172" y="140" fontWeight="700" fill="#1f8a5b">20</text><circle cx="172" cy="145" r="3" fill="#1f8a5b" />
                    <text x="212" y="140">21</text><text x="252" y="140">22</text><text x="292" y="140">23</text>
                    <text x="52" y="160">24</text><text x="92" y="160">25</text><text x="132" y="160">26</text>
                    <text x="172" y="160" fontWeight="700" fill="#1f8a5b">27</text><circle cx="172" cy="165" r="3" fill="#1f8a5b" />
                    <text x="212" y="160">28</text><text x="252" y="160">29</text><text x="292" y="160">30</text>
                    <text x="52" y="180">31</text>
                  </g>
                </svg>
              </div>
              <p className="v2ShowcaseCaption">Members always know when the next event is</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="v2HowItWorks">
        <div className="v2Container">
          <h2 className="v2SectionTitle">Up and Running in Minutes</h2>
          <div className="v2StepsGrid">
            <div className="v2Step">
              <div className="v2StepNum">1</div>
              <h3>Sign Up &amp; Configure</h3>
              <p>Tell us about your league — format, schedule, buy-in. We set up your site.</p>
            </div>
            <div className="v2StepLine" aria-hidden="true" />
            <div className="v2Step">
              <div className="v2StepNum">2</div>
              <h3>Add Your Members</h3>
              <p>Import your roster or let members sign up themselves. Handicaps start building from day one.</p>
            </div>
            <div className="v2StepLine" aria-hidden="true" />
            <div className="v2Step">
              <div className="v2StepNum">3</div>
              <h3>Run Your League</h3>
              <p>Post scores, calculate winnings, and watch participation grow week after week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section id="social-proof" className="v2Social">
        <div className="v2Container">
          <h2 className="v2SectionTitle">Trusted by Courses Like Yours</h2>
          <div className="v2TestimonialGrid">
            <div className="v2Testimonial">
              <svg viewBox="0 0 32 32" className="v2QuoteMark" aria-hidden="true"><text x="0" y="28" fontSize="36" fill="#cfe3c6" fontFamily="Georgia, serif">"</text></svg>
              <p>Our league membership grew from just over 100 to nearly 400 members — and most of them now play more than once a week.</p>
              <div className="v2TestimonialAuthor">
                <strong>Eric K.</strong>
                <span>Head Pro</span>
              </div>
            </div>
            <div className="v2Testimonial">
              <svg viewBox="0 0 32 32" className="v2QuoteMark" aria-hidden="true"><text x="0" y="28" fontSize="36" fill="#cfe3c6" fontFamily="Georgia, serif">"</text></svg>
              <p>We used to spend an hour after every event calculating payouts. Now it takes five minutes.</p>
              <div className="v2TestimonialAuthor">
                <strong>Steve D.</strong>
                <span>League Director</span>
              </div>
            </div>
            <div className="v2Testimonial">
              <svg viewBox="0 0 32 32" className="v2QuoteMark" aria-hidden="true"><text x="0" y="28" fontSize="36" fill="#cfe3c6" fontFamily="Georgia, serif">"</text></svg>
              <p>The league-only handicaps fixed our sandbagging problem overnight. The guys actually trust the system now.</p>
              <div className="v2TestimonialAuthor">
                <strong>Bill T.</strong>
                <span>General Manager</span>
              </div>
            </div>
          </div>
          <div className="v2LogoRow">
            {courseLogos.length > 0
              ? courseLogos.map((c) => (
                  <div key={c.id} className="v2LogoSlot">
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.name} className="v2LogoImg" />
                    ) : (
                      <span className="v2LogoText">{c.name}</span>
                    )}
                  </div>
                ))
              : FEATURED_COURSES.map((c) => (
                  <div key={c.id} className="v2LogoSlot">
                    <span className="v2LogoText">{c.name}</span>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="v2Pricing">
        <div className="v2Container">
          <h2 className="v2SectionTitle">Simple, Transparent Pricing</h2>
          <div className="v2PricingCard">
            <h3>Per-Course License</h3>
            <p className="v2PricingContact">Contact us for pricing</p>
            <ul className="v2PricingList">
              <li>Unlimited members</li>
              <li>Public league website</li>
              <li>Sponsorship placements</li>
              <li>Instant score posting</li>
              <li>Automated handicaps</li>
              <li>Season money list</li>
              <li>Mobile-friendly for all members</li>
            </ul>
            <button className="v2PrimaryBtn v2BtnLg v2BtnFull" onClick={() => scrollTo("cta-final")}>Get a Quote</button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="v2Faq">
        <div className="v2Container">
          <h2 className="v2SectionTitle">Frequently Asked Questions</h2>
          <div className="v2FaqList">
            {faqs.map((faq, i) => (
              <div key={i} className={`v2FaqItem ${expandedFaq === i ? "v2FaqOpen" : ""}`}>
                <button className="v2FaqQ" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span className="v2FaqChevron">{expandedFaq === i ? "−" : "+"}</span>
                </button>
                {expandedFaq === i && <div className="v2FaqA">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section id="cta-final" className="v2CtaFinal">
        <div className="v2Container v2CtaGrid">
          <div className="v2CtaCopy">
            <h2>Ready to Grow Your Men's League?</h2>
            <p>Schedule a free walkthrough. We'll show you how Member Golf Online can work for your course.</p>
            <ul className="v2CtaPoints">
              <li>No contracts — cancel anytime</li>
              <li>Setup in one day</li>
              <li>Free demo and consultation</li>
            </ul>
          </div>
          <form className="v2LeadForm" onSubmit={submitLead}>
            <h3>Schedule My Demo</h3>
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input placeholder="Course name" value={course} onChange={(e) => setCourse(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <button className="v2PrimaryBtn v2BtnLg v2BtnFull" type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Schedule My Demo"}
            </button>
            {sent ? <div className="v2Success">Thanks! We'll be in touch shortly.</div> : null}
            {error ? <div className="v2Error">{error}</div> : null}
          </form>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="v2Footer">
        <div className="v2Container v2FooterInner">
          <span>&copy; {new Date().getFullYear()} Member Golf Online</span>
          <div className="v2FooterLinks">
            <Link to="/blog">Blog</Link>
            <Link to="/login">Course Login</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Sora:wght@700;800&display=swap");
        .v2Marketing {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          font-family: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .fontBrand { font-family: "Sora", "Manrope", system-ui, sans-serif; }
        .v2Container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

        /* Nav */
        .v2Nav {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e2e8f0;
        }
        .v2NavInner { max-width: 1080px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
        .v2NavBrand { display: flex; align-items: center; gap: 10px; }
        .v2NavMark { width: 36px; height: 36px; }
        .v2NavName { font-size: 18px; font-weight: 800; color: #1f8a5b; letter-spacing: -0.3px; }
        .v2NavActions { display: flex; align-items: center; gap: 10px; }
        .v2NavLogin { text-decoration: none; font-weight: 600; color: #0f172a; padding: 8px 14px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; transition: all 160ms; font-size: 13px; }
        .v2NavLogin:hover { background: #f1f5f9; }

        /* Buttons */
        .v2PrimaryBtn {
          display: inline-block; text-decoration: none; border: none; cursor: pointer;
          background: #1f8a5b; color: #fff; padding: 10px 20px; border-radius: 999px;
          font-weight: 700; font-size: 13px; font-family: inherit;
          box-shadow: 0 4px 14px rgba(31,138,91,0.2);
          transition: all 160ms;
        }
        .v2PrimaryBtn:hover { background: #1a7a50; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(31,138,91,0.25); }
        .v2PrimaryBtn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .v2SecondaryBtn {
          display: inline-block; text-decoration: none; border: 1px solid #cfe3c6; cursor: pointer;
          background: #edf7ea; color: #14532d; padding: 10px 20px; border-radius: 999px;
          font-weight: 700; font-size: 13px; font-family: inherit;
          transition: all 160ms;
        }
        .v2SecondaryBtn:hover { background: #e2f1dd; border-color: #b8d3b0; }
        .v2BtnLg { padding: 14px 28px; font-size: 15px; }
        .v2BtnFull { width: 100%; text-align: center; }

        /* Section common */
        .v2SectionTitle { text-align: center; font-size: 28px; margin: 0 0 8px; color: #0f172a; }
        .v2SectionSub { text-align: center; color: #64748b; margin: 0 0 40px; font-size: 15px; }
        .v2Light { color: #fff; }
        .v2TitleGreen { color: #1f8a5b; }
        section { scroll-margin-top: 80px; }

        /* Hero */
        .v2Hero {
          position: relative;
          min-height: 480px;
          display: flex; align-items: center;
          background: url("https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1600&q=80") center/cover no-repeat;
        }
        .v2HeroOverlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(11,61,46,0.35) 0%, rgba(20,83,45,0.22) 50%, rgba(31,138,91,0.15) 100%);
        }
        .v2HeroContent {
          position: relative; z-index: 1;
          max-width: 680px;
          padding: 80px 24px;
        }
        .v2HeroContent h1 { font-size: 44px; line-height: 1.1; margin: 0 0 18px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.4); }
        .v2HeroSub { font-size: 18px; color: rgba(255,255,255,0.95); margin: 0 0 28px; line-height: 1.6; text-shadow: 0 1px 8px rgba(0,0,0,0.35); }
        .v2HeroActions { display: flex; gap: 14px; flex-wrap: wrap; }
        .v2HeroSecondary {
          display: inline-block; text-decoration: none; cursor: pointer;
          background: rgba(255,255,255,0.15); color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 14px 28px; border-radius: 999px;
          font-weight: 700; font-size: 15px; font-family: inherit;
          backdrop-filter: blur(4px);
          transition: all 160ms;
        }
        .v2HeroSecondary:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5); }

        /* Browser Frame (kept for showcase section) */
        .v2BrowserFrame {
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 20px 50px rgba(15,23,42,0.12);
          border: 1px solid #dbe7d7;
          background: #fff;
        }
        .v2BrowserSm { max-width: 320px; margin: 0 auto; }
        .v2BrowserBar {
          background: #f1f5f9; padding: 8px 12px; display: flex; gap: 6px; align-items: center;
          border-bottom: 1px solid #e2e8f0;
        }
        .v2Dot { width: 10px; height: 10px; border-radius: 50%; }
        .v2DotRed { background: #ff5f57; }
        .v2DotYellow { background: #ffbd2e; }
        .v2DotGreen { background: #28c840; }
        .v2MockSvg { width: 100%; display: block; }

        /* Problems */
        .v2Problems { padding: 80px 0; background: #f1f5f9; color: #0f172a; }
        .v2ProblemGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 32px; }
        .v2ProblemCard {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 14px; padding: 24px; text-align: center;
          box-shadow: 0 4px 12px rgba(15,23,42,0.04);
        }
        .v2ProblemCard h3 { margin: 12px 0 8px; font-size: 16px; color: #0f172a; }
        .v2ProblemCard p { margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }
        .v2Icon { width: 40px; height: 40px; }

        /* Benefits */
        .v2Benefits { padding: 80px 0; }
        .v2BenefitGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .v2BenefitCard {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px;
          box-shadow: 0 4px 12px rgba(15,23,42,0.04);
          transition: box-shadow 200ms, transform 200ms;
        }
        .v2BenefitCard:hover { box-shadow: 0 8px 24px rgba(15,23,42,0.08); transform: translateY(-2px); }
        .v2BenefitIcon { width: 48px; height: 48px; margin-bottom: 12px; }
        .v2Emoji { font-size: 36px; display: block; margin-bottom: 12px; }
        .v2BenefitCard h3 { margin: 0 0 8px; font-size: 16px; color: #14532d; }
        .v2BenefitCard p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.5; }

        /* Showcase */
        .v2Showcase { padding: 80px 0; background: #f1f5f9; }
        .v2ShowcaseGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .v2ShowcaseItem { text-align: center; }
        .v2ShowcaseCaption { margin: 14px 0 0; font-size: 14px; color: #475569; font-weight: 600; }

        /* How It Works */
        .v2HowItWorks { padding: 80px 0; }
        .v2StepsGrid { display: flex; align-items: flex-start; justify-content: center; gap: 0; }
        .v2Step { text-align: center; flex: 1; max-width: 260px; }
        .v2StepNum {
          width: 48px; height: 48px; border-radius: 50%; background: #1f8a5b; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 800; margin-bottom: 14px;
        }
        .v2Step h3 { margin: 0 0 8px; font-size: 16px; color: #14532d; }
        .v2Step p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.5; }
        .v2StepLine { width: 60px; height: 2px; background: #cfe3c6; margin-top: 24px; flex-shrink: 0; }

        /* Social Proof */
        .v2Social { padding: 80px 0; background: #f8fafc; }
        .v2TestimonialGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
        .v2Testimonial {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;
          position: relative;
        }
        .v2QuoteMark { width: 28px; height: 28px; }
        .v2Testimonial p { font-size: 14px; color: #475569; line-height: 1.55; margin: 4px 0 16px; font-style: italic; }
        .v2TestimonialAuthor { font-size: 13px; }
        .v2TestimonialAuthor strong { color: #14532d; }
        .v2TestimonialAuthor span { color: #64748b; margin-left: 6px; }
        .v2LogoRow { display: flex; justify-content: center; gap: 28px; flex-wrap: wrap; align-items: center; }
        .v2LogoSlot {
          width: 160px; height: 80px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          padding: 8px;
        }
        .v2LogoImg { max-width: 100%; max-height: 100%; object-fit: contain; }
        .v2LogoText { font-size: 13px; color: #64748b; font-weight: 600; text-align: center; }

        /* Pricing */
        .v2Pricing { padding: 80px 0; background: #f1f5f9; }
        .v2PricingCard {
          max-width: 400px; margin: 24px auto 0; background: #fff; border: 1px solid #e2e8f0;
          border-radius: 16px; padding: 36px; text-align: center;
          box-shadow: 0 8px 24px rgba(15,23,42,0.06);
        }
        .v2PricingCard h3 { margin: 0 0 4px; font-size: 20px; color: #14532d; }
        .v2PricingContact { color: #64748b; margin: 0 0 20px; font-size: 15px; }
        .v2PricingList { list-style: none; padding: 0; margin: 0 0 24px; text-align: left; }
        .v2PricingList li {
          padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;
          padding-left: 24px; position: relative;
        }
        .v2PricingList li::before { content: "✓"; position: absolute; left: 0; color: #1f8a5b; font-weight: 700; }

        /* FAQ */
        .v2Faq { padding: 80px 0; }
        .v2FaqList { max-width: 680px; margin: 24px auto 0; }
        .v2FaqItem { border-bottom: 1px solid #e2e8f0; }
        .v2FaqQ {
          width: 100%; background: none; border: none; cursor: pointer; font-family: inherit;
          padding: 18px 0; display: flex; justify-content: space-between; align-items: center;
          font-size: 15px; font-weight: 600; color: #0f172a; text-align: left;
        }
        .v2FaqQ:hover { color: #1f8a5b; }
        .v2FaqChevron { font-size: 20px; color: #94a3b8; flex-shrink: 0; margin-left: 12px; }
        .v2FaqA { padding: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.6; }

        /* Final CTA */
        .v2CtaFinal { padding: 80px 0; background: #14532d; color: #fff; }
        .v2CtaGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .v2CtaCopy h2 { font-size: 30px; margin: 0 0 12px; }
        .v2CtaCopy p { font-size: 15px; color: rgba(255,255,255,0.85); margin: 0 0 20px; line-height: 1.5; }
        .v2CtaPoints { list-style: none; padding: 0; margin: 0; }
        .v2CtaPoints li { padding: 6px 0; font-size: 14px; color: rgba(255,255,255,0.8); padding-left: 20px; position: relative; }
        .v2CtaPoints li::before { content: "✓"; position: absolute; left: 0; color: #4ade80; font-weight: 700; }
        .v2LeadForm {
          background: #fff; border-radius: 16px; padding: 28px;
          display: grid; gap: 12px; color: #0f172a;
        }
        .v2LeadForm h3 { margin: 0 0 4px; font-size: 18px; color: #14532d; }
        .v2LeadForm input {
          padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0;
          font-size: 14px; font-family: inherit;
        }
        .v2LeadForm input:focus { outline: 2px solid #1f8a5b; outline-offset: -1px; border-color: #1f8a5b; }
        .v2Success { color: #15803d; font-size: 13px; font-weight: 600; }
        .v2Error { color: #b91c1c; font-size: 13px; }

        /* Footer */
        .v2Footer { padding: 20px 0; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .v2FooterInner { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; }
        .v2FooterLinks { display: flex; gap: 20px; }
        .v2FooterInner a, .v2FooterLinks a { color: #1f8a5b; text-decoration: none; font-weight: 600; }

        /* Responsive */
        @media (max-width: 900px) {
          .v2HeroContent h1 { font-size: 32px; }
          .v2HeroContent { padding: 60px 24px; }
          .v2ProblemGrid { grid-template-columns: 1fr; }
          .v2BenefitGrid { grid-template-columns: repeat(2, 1fr); }
          .v2ShowcaseGrid { grid-template-columns: 1fr; max-width: 340px; margin: 0 auto; }
          .v2StepsGrid { flex-direction: column; align-items: center; }
          .v2StepLine { width: 2px; height: 30px; }
          .v2TestimonialGrid { grid-template-columns: 1fr; }
          .v2CtaGrid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .v2HeroContent h1 { font-size: 26px; }
          .v2HeroActions { flex-direction: column; }
          .v2HeroActions .v2PrimaryBtn,
          .v2HeroActions .v2HeroSecondary { width: 100%; text-align: center; }
          .v2BenefitGrid { grid-template-columns: 1fr; }
          .v2SectionTitle { font-size: 24px; }
          .v2LogoRow { flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  );
}
