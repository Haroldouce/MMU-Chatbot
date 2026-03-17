import { Card } from "@/components/ui/card"

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Ask Your Question",
      description: "Type your question in natural language, just like talking to a friend.",
    },
    {
      number: "02",
      title: "AI Processes",
      description: "Our AI understands your question and searches through university knowledge base.",
    },
    {
      number: "03",
      title: "Get Instant Answer",
      description: "Receive accurate, detailed answers in seconds with relevant links and resources.",
    },
  ]

  return (
    <section id="how-it-works" className="bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">{"How it works"}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {"Getting answers is simple and fast. Just three easy steps."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <Card key={index} className="p-8 text-center relative">
              <div className="text-5xl font-bold text-accent/20 mb-4">{step.number}</div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
