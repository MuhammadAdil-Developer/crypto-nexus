import { useState } from "react";
import { HelpCircle, MessageSquare, FileText, Phone, Mail, ChevronDown, Search } from "lucide-react";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const faqData = [
  {
    question: "How do I make a purchase?",
    answer: "To make a purchase, browse our listings, click on a product you want, and follow the checkout process. You'll pay with cryptocurrency (BTC or XMR) and receive your digital product within minutes."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept Bitcoin (BTC) and Monero (XMR) for all transactions. This ensures privacy and security for both buyers and vendors."
  },
  {
    question: "How does escrow protection work?",
    answer: "Escrow protection holds your payment until you confirm receipt of your digital product. This protects you from fraud and ensures vendors deliver quality products."
  },
  {
    question: "What if my account doesn't work?",
    answer: "All products come with a warranty period. If your account stops working during the warranty period, contact the vendor through our messaging system for a replacement."
  },
  {
    question: "How do I contact a vendor?",
    answer: "Use our built-in messaging system to communicate with vendors. Go to Messages in your dashboard to start or continue conversations."
  },
  {
    question: "Can I get a refund?",
    answer: "Refunds are handled on a case-by-case basis. If there's an issue with your purchase, open a dispute and our support team will review your case."
  },
  {
    question: "How do I track my orders?",
    answer: "Visit the Orders section in your dashboard to see the status of all your purchases. You'll get notifications for status updates."
  },
  {
    question: "Is my personal information safe?",
    answer: "We prioritize privacy and use minimal data collection. Your transactions are anonymous and we don't store unnecessary personal information."
  }
];

export default function BuyerSupport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    priority: "",
    description: ""
  });

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle ticket submission
    console.log("Ticket submitted:", ticketForm);
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white border border-gray-700">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Help & Support</h1>
              <p className="text-gray-300">Get help with your account and orders</p>
            </div>
          </div>
        </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Live Chat</h3>
              <p className="text-sm text-gray-400 mb-4">
                Get instant help from our support team
              </p>
              <Button className="w-full bg-gray-700">
                Start Chat
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Email Support</h3>
              <p className="text-sm text-gray-400 mb-4">
                Send us an email and we'll respond within 24h
              </p>
              <Button variant="outline" className="w-full">
                support@cryptomarket.com
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-700 bg-gray-900 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Submit Ticket</h3>
              <p className="text-sm text-gray-400 mb-4">
                Create a detailed support request
              </p>
              <Button variant="outline" className="w-full">
                Create Ticket
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FAQ Section */}
          <div>
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5" />
                  <span>Frequently Asked Questions</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search FAQ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredFAQ.map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 dark:text-gray-400 pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Support Ticket Form */}
          <div>
            <Card className="border border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Submit Support Ticket</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({...ticketForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="order">Order Issue</SelectItem>
                          <SelectItem value="payment">Payment Problem</SelectItem>
                          <SelectItem value="account">Account Access</SelectItem>
                          <SelectItem value="vendor">Vendor Dispute</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({...ticketForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Please provide detailed information about your issue..."
                      className="min-h-32"
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gray-700">
                    Submit Ticket
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support Resources */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">User Guide</h4>
                <p className="text-sm text-gray-400 mb-3">Complete guide to using our platform</p>
                <Button variant="outline" size="sm">Read Guide</Button>
              </div>

              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">Community Forum</h4>
                <p className="text-sm text-gray-400 mb-3">Connect with other users and get tips</p>
                <Button variant="outline" size="sm">Visit Forum</Button>
              </div>

              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <HelpCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">Video Tutorials</h4>
                <p className="text-sm text-gray-400 mb-3">Step-by-step video guides</p>
                <Button variant="outline" size="sm">Watch Videos</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </BuyerLayout>
  );
}