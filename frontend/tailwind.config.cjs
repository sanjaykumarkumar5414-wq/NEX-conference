/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          soft: "#6366f1"
        }
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.75" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px -4px rgba(99, 102, 241, 0.35)" },
          "50%": { boxShadow: "0 0 28px -2px rgba(99, 102, 241, 0.5)" }
        },
        "glow-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" }
        },
        "panel-glow": {
          "0%, 100%": {
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px -24px rgba(99, 102, 241, 0.2)"
          },
          "50%": {
            boxShadow:
              "0 30px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 100px -20px rgba(99, 102, 241, 0.28)"
          }
        },
        "cta-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.2), 0 4px 20px -4px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.25), 0 0 32px -4px rgba(99, 102, 241, 0.5), 0 0 48px -12px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)"
          }
        }
      },
      animation: {
        "gradient-shift": "gradient-shift 10s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "glow-soft": "glow-soft 4s ease-in-out infinite",
        "panel-glow": "panel-glow 5s ease-in-out infinite",
        "cta-glow": "cta-glow 2.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

