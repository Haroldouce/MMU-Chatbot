import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function Hero() {
  return (
    <section className="container mx-auto px-4 py-24 md:py-32">
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-6">
          <Sparkles className="h-4 w-4" />
          <span>{"Powered by AI"}</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance">
          {"Get instant answers to your "}
          <span className="text-foreground">{"university questions"}</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 max-w-2xl text-pretty leading-relaxed">
          {
            "EBchat is your 24/7 intelligent assistant for Multimedia University. From admissions to academics, get accurate answers in seconds."
          }
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base h-12 px-8">
            {"Start Chatting"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" className="text-base h-12 px-8 bg-transparent">
            {"View Demo"}
          </Button>
        </div>
      </div>
    </section>
  )
}
