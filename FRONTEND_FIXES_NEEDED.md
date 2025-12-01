# Frontend Fixes Needed

## 1. Quick Reply Templates (client/src/pages/admin/tickets.tsx)
- Add state to track selected ticket for template insertion
- Add onClick handlers to "Use Template" buttons that:
  - Open the ticket detail modal if not already open
  - Insert template text into the message field
- Templates:
  - Account Recovery: "Thank you for contacting support. To help you recover your account, please provide your recovery phrase and we'll assist you immediately."
  - Order Issue: "We apologize for the issue with your order. Please provide your order ID and we'll investigate immediately. We'll get back to you within 24 hours."
  - General Inquiry: "Thank you for reaching out. We've received your inquiry and will respond within 24 hours. If this is urgent, please mark it as high priority."
  - Vendor Application: "Thank you for your vendor application. We'll review your submission and respond within 3-5 business days. You'll receive an email notification once the review is complete."

## 2. Message Icon Fix (client/src/pages/admin/tickets.tsx)
- Line 535: Change the MessageSquare button onClick to open ticket detail modal:
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  className="text-gray-400 hover:text-white" 
  onClick={() => {
    setSelectedTicketId(ticket.id);
    setIsTicketModalOpen(true);
  }}
  data-testid={`reply-ticket-${ticket.id}`}
>
  <MessageSquare className="w-4 h-4" />
</Button>
```

## 3. Ticket Reopen (client/src/components/tickets/TicketDetailModal.tsx)
- Add reopen button when ticket status is "closed"
- Add reopen handler that calls ticketService.reopenTicket()
- Add reopenTicket method to ticketService.ts

## 4. Admin User Selector for Ticket Assignment (client/src/components/tickets/TicketDetailModal.tsx)
- Add state for admin users list
- Fetch admin users on modal open (use ticketService.getAdminUsers())
- Add Select component for assigning tickets
- Update handleAssignTicket to use selected admin user ID

## 5. Category Management (client/src/pages/admin/categories.tsx)
- Connect "Add Category" button to create category API
- Connect Edit buttons to update category API
- Connect Delete buttons to delete category API
- Add category field to listing creation form

## 6. Login as User (client/src/pages/admin/users.tsx)
- Update handleLoginAsUser to call the new API endpoint
- Store the returned tokens and redirect user

## 7. User Activity Display (client/src/pages/admin/users.tsx)
- Update activity modal to display all activity types properly
- Format dates and activity descriptions correctly


