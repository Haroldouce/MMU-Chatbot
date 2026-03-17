import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="bg-primary text-primary-foreground rounded-2xl p-12 md:p-16 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">{"Ready to get started?"}</h2>
        <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto text-pretty">
          {
            "Join hundreds of students and staff already using EBchat to get quick answers to their university questions."
          }
        </p>
        <Button size="lg" variant="secondary" className="text-base h-12 px-8">
          {"Try EBchat Now"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  )
}
