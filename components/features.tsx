import { Card } from "@/components/ui/card"
import { Clock, Brain, Shield, Zap } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: Clock,
      title: "Available 24/7",
      description: "Get answers anytime, anywhere. No waiting for office hours or email responses.",
    },
    {
      icon: Brain,
      title: "AI-Powered Intelligence",
      description: "Advanced natural language processing understands your questions and provides accurate answers.",
    },
    {
      icon: Shield,
      title: "Reliable & Accurate",
      description: "Trained on official university documentation to ensure accurate and up-to-date information.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant responses in seconds. No more searching through multiple pages or documents.",
    },
  ]

  return (
    <section id="features" className="container mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">{"Why choose EBchat?"}</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
          {"Your intelligent assistant designed specifically for Multimedia University students and staff."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4 inline-flex p-3 rounded-lg bg-accent/10">
              <feature.icon className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
