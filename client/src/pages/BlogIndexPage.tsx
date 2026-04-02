import { Link } from "react-router-dom";
import { useEffect } from "react";
import { blogPosts } from "../blog/posts";

export default function BlogIndexPage() {
  useEffect(() => {
    document.title = "Blog | Member Golf Online";
    window.scrollTo(0, 0);
  }, []);

  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="blogIndex">
      <nav className="blogNav">
        <div className="blogNavInner">
          <Link to="/v2" className="blogNavBrand fontBrand">Member Golf Online</Link>
          <Link to="/v2" className="blogNavBack">Back to Home</Link>
        </div>
      </nav>

      <header className="blogHeader">
        <h1>Blog</h1>
        <p>Tips, guides, and best practices for running a thriving men's golf league.</p>
      </header>

      <div className="blogGrid">
        {sorted.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className="blogCard">
            <span className="blogCardCategory">{post.category}</span>
            <h2>{post.title}</h2>
            <p>{post.description}</p>
            <div className="blogCardMeta">
              <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span>{post.readTime}</span>
            </div>
          </Link>
        ))}
      </div>

      <footer className="blogFooter">
        <span>&copy; {new Date().getFullYear()} Member Golf Online</span>
        <Link to="/v2">Home</Link>
      </footer>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Sora:wght@700;800&display=swap");
        .blogIndex {
          min-height: 100vh; background: #f8fafc; color: #0f172a;
          font-family: "Manrope", system-ui, sans-serif;
        }
        .fontBrand { font-family: "Sora", "Manrope", system-ui, sans-serif; }
        .blogNav {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(10px);
          border-bottom: 1px solid #e2e8f0;
        }
        .blogNavInner {
          max-width: 900px; margin: 0 auto; padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .blogNavBrand { font-size: 18px; font-weight: 800; color: #1f8a5b; text-decoration: none; }
        .blogNavBack {
          font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none;
          padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 999px;
        }
        .blogNavBack:hover { background: #f1f5f9; }
        .blogHeader {
          max-width: 900px; margin: 0 auto; padding: 60px 24px 40px;
        }
        .blogHeader h1 { font-size: 36px; margin: 0 0 8px; color: #14532d; }
        .blogHeader p { font-size: 16px; color: #64748b; margin: 0; }
        .blogGrid {
          max-width: 900px; margin: 0 auto; padding: 0 24px 60px;
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
        }
        .blogCard {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 24px; text-decoration: none; color: inherit;
          transition: box-shadow 200ms, transform 200ms;
        }
        .blogCard:hover { box-shadow: 0 8px 24px rgba(15,23,42,0.08); transform: translateY(-2px); }
        .blogCardCategory {
          font-size: 11px; font-weight: 700; color: #1f8a5b;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .blogCard h2 { font-size: 18px; margin: 8px 0 8px; line-height: 1.3; color: #0f172a; }
        .blogCard p { font-size: 14px; color: #64748b; margin: 0 0 14px; line-height: 1.5; }
        .blogCardMeta { display: flex; gap: 16px; font-size: 12px; color: #94a3b8; }
        .blogFooter {
          max-width: 900px; margin: 0 auto; padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex; justify-content: space-between; font-size: 13px; color: #64748b;
        }
        .blogFooter a { color: #1f8a5b; text-decoration: none; font-weight: 600; }
        @media (max-width: 700px) {
          .blogGrid { grid-template-columns: 1fr; }
          .blogHeader h1 { font-size: 28px; }
        }
      `}</style>
    </div>
  );
}
