export function Stats() {
  const stats = [
    {
      value: "24/7",
      label: "Always Available",
    },
    {
      value: "< 5s",
      label: "Average Response Time",
    },
    {
      value: "95%",
      label: "Answer Accuracy",
    },
    {
      value: "1000+",
      label: "Questions Answered",
    },
  ]

  return (
    <section className="border-y border-border bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
