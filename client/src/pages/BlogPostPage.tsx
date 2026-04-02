import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { getPostBySlug, blogPosts } from "../blog/posts";

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Member Golf Online`;

      const setMeta = (name: string, content: string, attr = "name") => {
        let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.content = content;
      };

      setMeta("description", post.description);
      setMeta("og:title", post.title, "property");
      setMeta("og:description", post.description, "property");
      setMeta("og:type", "article", "property");
    }
    window.scrollTo(0, 0);
    return () => {
      document.title = "Member Golf Online";
    };
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const relatedPosts = sorted.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="blogPost">
      <nav className="bpNav">
        <div className="bpNavInner">
          <Link to="/v2" className="bpNavBrand fontBrand">Member Golf Online</Link>
          <Link to="/blog" className="bpNavBack">All Posts</Link>
        </div>
      </nav>

      <article className="bpArticle">
        <header className="bpHeader">
          <span className="bpCategory">{post.category}</span>
          <h1>{post.title}</h1>
          <div className="bpMeta">
            <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            <span>{post.readTime}</span>
            <span>{post.author}</span>
          </div>
        </header>

        <div className="bpContent" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="bpCta">
          <h3>Ready to modernize your league?</h3>
          <p>See how Member Golf Online can save you hours every week and keep your members engaged all season.</p>
          <Link to="/v2#cta-final" className="bpCtaBtn">Schedule a Demo</Link>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="bpRelated">
          <h3>More Articles</h3>
          <div className="bpRelatedGrid">
            {relatedPosts.map((rp) => (
              <Link key={rp.slug} to={`/blog/${rp.slug}`} className="bpRelatedCard">
                <span className="bpRelatedCat">{rp.category}</span>
                <h4>{rp.title}</h4>
                <span className="bpRelatedDate">
                  {new Date(rp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="bpFooter">
        <span>&copy; {new Date().getFullYear()} Member Golf Online</span>
        <Link to="/v2">Home</Link>
      </footer>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Sora:wght@700;800&display=swap");
        .blogPost {
          min-height: 100vh; background: #f8fafc; color: #0f172a;
          font-family: "Manrope", system-ui, sans-serif;
        }
        .fontBrand { font-family: "Sora", "Manrope", system-ui, sans-serif; }
        .bpNav {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(10px);
          border-bottom: 1px solid #e2e8f0;
        }
        .bpNavInner {
          max-width: 740px; margin: 0 auto; padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .bpNavBrand { font-size: 18px; font-weight: 800; color: #1f8a5b; text-decoration: none; }
        .bpNavBack {
          font-size: 13px; font-weight: 600; color: #64748b; text-decoration: none;
          padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 999px;
        }
        .bpNavBack:hover { background: #f1f5f9; }
        .bpArticle { max-width: 740px; margin: 0 auto; padding: 48px 24px 40px; }
        .bpHeader { margin-bottom: 36px; }
        .bpCategory {
          font-size: 11px; font-weight: 700; color: #1f8a5b;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .bpHeader h1 { font-size: 34px; line-height: 1.2; margin: 10px 0 14px; color: #14532d; }
        .bpMeta { display: flex; gap: 16px; font-size: 13px; color: #94a3b8; }
        .bpContent { font-size: 16px; line-height: 1.75; color: #334155; }
        .bpContent h2 { font-size: 22px; margin: 36px 0 12px; color: #14532d; }
        .bpContent h3 { font-size: 18px; margin: 28px 0 8px; color: #14532d; }
        .bpContent p { margin: 0 0 18px; }
        .bpContent ul, .bpContent ol { margin: 0 0 18px; padding-left: 24px; }
        .bpContent li { margin-bottom: 8px; }
        .bpContent strong { color: #0f172a; }
        .bpCta {
          margin: 48px 0 0; padding: 32px;
          background: #14532d; color: #fff; border-radius: 16px; text-align: center;
        }
        .bpCta h3 { margin: 0 0 8px; font-size: 22px; }
        .bpCta p { margin: 0 0 20px; font-size: 15px; color: rgba(255,255,255,0.8); }
        .bpCtaBtn {
          display: inline-block; background: #1f8a5b; color: #fff;
          padding: 12px 24px; border-radius: 999px; text-decoration: none;
          font-weight: 700; font-size: 14px;
          box-shadow: 0 4px 14px rgba(31,138,91,0.2);
          transition: all 160ms;
        }
        .bpCtaBtn:hover { background: #1a7a50; transform: translateY(-1px); }
        .bpRelated { max-width: 740px; margin: 0 auto; padding: 40px 24px 60px; }
        .bpRelated h3 { font-size: 20px; margin: 0 0 20px; color: #14532d; }
        .bpRelatedGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .bpRelatedCard {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 18px; text-decoration: none; color: inherit;
          transition: box-shadow 200ms;
        }
        .bpRelatedCard:hover { box-shadow: 0 6px 16px rgba(15,23,42,0.06); }
        .bpRelatedCat { font-size: 10px; font-weight: 700; color: #1f8a5b; text-transform: uppercase; letter-spacing: 0.5px; }
        .bpRelatedCard h4 { font-size: 14px; margin: 6px 0 10px; line-height: 1.3; color: #0f172a; }
        .bpRelatedDate { font-size: 11px; color: #94a3b8; }
        .bpFooter {
          max-width: 740px; margin: 0 auto; padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex; justify-content: space-between; font-size: 13px; color: #64748b;
        }
        .bpFooter a { color: #1f8a5b; text-decoration: none; font-weight: 600; }
        @media (max-width: 700px) {
          .bpHeader h1 { font-size: 26px; }
          .bpRelatedGrid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
