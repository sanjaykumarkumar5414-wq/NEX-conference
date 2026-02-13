import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onGoToLogin?: () => void;
}

export function LandingPage({ onGoToLogin }: LandingPageProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroImageRef = useRef<HTMLDivElement | null>(null);
  const heroTextRef = useRef<HTMLDivElement | null>(null);
  const heroCtaRef = useRef<HTMLButtonElement | null>(null);
  const howItWorksRef = useRef<HTMLElement | null>(null);
  const benefitsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!pageRef.current) return;

    const ctx = gsap.context(() => {
      if (heroImageRef.current) {
        gsap.fromTo(
          heroImageRef.current,
          { scale: 1 },
          {
            scale: 1.06,
            ease: "none",
            scrollTrigger: {
              trigger: heroImageRef.current,
              start: "top center",
              end: "bottom top",
              scrub: true
            }
          }
        );
      }

      if (heroTextRef.current) {
        gsap.fromTo(
          heroTextRef.current,
          { opacity: 1, y: 0 },
          {
            opacity: 0.4,
            y: -32,
            ease: "none",
            scrollTrigger: {
              trigger: heroTextRef.current,
              start: "top center",
              end: "bottom top",
              scrub: true
            }
          }
        );
      }

      if (heroCtaRef.current) {
        gsap.fromTo(
          heroCtaRef.current,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: heroCtaRef.current,
              start: "top bottom-=20%",
              end: "top center",
              scrub: true
            }
          }
        );
      }

      if (howItWorksRef.current) {
        const steps = howItWorksRef.current.querySelectorAll(
          "[data-how-step]"
        );
        gsap.from(steps, {
          opacity: 0,
          y: 24,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: howItWorksRef.current,
            start: "top 72%",
            end: "top 40%",
            scrub: true
          }
        });
      }

      if (benefitsRef.current) {
        const cards = benefitsRef.current.querySelectorAll(
          "[data-benefit-card]"
        );
        gsap.from(cards, {
          opacity: 0,
          y: 18,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: benefitsRef.current,
            start: "top 80%",
            end: "top 50%",
            scrub: true
          }
        });
      }
    }, pageRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={pageRef}
      className="relative flex min-h-screen w-screen flex-col overflow-hidden px-4 pt-4 pb-16 sm:px-6"
    >
      {/* Background image layer (conference.png) — kept exactly as used */}
      <div
        ref={heroImageRef}
        className="absolute inset-0 z-0 transition-transform duration-[400ms] ease-out hover:scale-[1.02]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url(/assets/conference.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          filter: "brightness(1.1) contrast(1.1)"
        }}
      />

      {/* Animated gradient overlay (dark blue → purple) */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-br from-slate-900/80 via-indigo-950/40 to-purple-950/50 animate-gradient-shift"
        aria-hidden
      />

      {/* Vignette — darker edges for immersion and depth */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 0%, rgba(15, 23, 42, 0.4) 50%, rgba(15, 23, 42, 0.75) 100%)"
        }}
        aria-hidden
      />

      {/* Animated blur orbs for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-indigo-500/12 blur-3xl animate-glow-soft" />
        <div className="absolute -right-32 top-1/2 h-80 w-80 rounded-full bg-purple-500/12 blur-3xl animate-glow-soft" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-slate-400/8 blur-3xl animate-glow-soft" style={{ animationDelay: "2s" }} />
      </div>

      {/* Hero content — glassmorphism panel with animated glow */}
      <section
        ref={heroTextRef}
        className="relative z-10 mx-auto mb-4 w-full max-w-[1150px] animate-fade-in-up opacity-0 sm:mb-6"
      >
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.07] px-6 py-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-4 md:rounded-[16px] animate-panel-glow"
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px -24px rgba(99, 102, 241, 0.2)"
          }}
        >
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-50 sm:text-3xl">
            Bring order to your most important meeting room.
          </h1>
          <div className="relative shrink-0">
            {/* Subtle glow halo behind CTA */}
            <div
              className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-md opacity-60"
              aria-hidden
            />
            <button
              ref={heroCtaRef}
              type="button"
              onClick={onGoToLogin}
              className="relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-indigo-500 via-indigo-600 to-purple-700 px-7 py-3 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/35 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-slate-950 animate-cta-glow"
            >
              Go to login
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
