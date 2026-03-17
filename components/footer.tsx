import { MessageSquare } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-6 w-6" />
              <span className="text-xl font-bold">EBchat</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              {
                "Your intelligent FAQ assistant for Multimedia University. Get instant answers to admissions, academics, and campus life questions."
              }
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{"Quick Links"}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  {"Features"}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  {"How It Works"}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  {"FAQ"}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{"Resources"}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  {"Documentation"}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  {"Support"}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  {"Contact"}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>{"© 2025 EBchat. All rights reserved. Multimedia University."}</p>
        </div>
      </div>
    </footer>
  )
}
