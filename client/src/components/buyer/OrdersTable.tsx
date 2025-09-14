import { useState } from "react";
import { MoreVertical, Package, Truck, CheckCircle, XCircle, Clock, Shield, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Order } from "@/services/orderService";
import { OrderProductModal } from "./OrderProductModal";
import { useToast } from "@/hooks/use-toast";

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    case "shipped":
      return <Truck className="w-4 h-4" />;
    case "processing":
    case "pending":
    case "pending_payment":
      return <Clock className="w-4 h-4" />;
    case "cancelled":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "text-green-400 bg-green-900/20";
    case "shipped":
      return "text-yellow-400 bg-yellow-900/20";
    case "processing":
      return "text-blue-400 bg-blue-900/20";
    case "pending":
      return "text-yellow-400 bg-yellow-900/20";
    case "pending_payment":
      return "text-yellow-300 bg-yellow-200/20";
    case "cancelled":
      return "text-red-400 bg-red-900/20";
    default:
      return "text-gray-400 bg-gray-900/20";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "Delivered";
    case "shipped":
      return "In Transit";
    case "processing":
      return "Processing";
    case "pending":
      return "Pending";
    case "pending_payment":
      return "Pending Payment";
    case "cancelled":
      return "Cancelled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

interface OrdersTableProps {
  compact?: boolean;
  orders?: Order[];
}

export function OrdersTable({ compact = false, orders = [] }: OrdersTableProps) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const { toast } = useToast();
  const displayOrders = compact ? orders.slice(0, 3) : orders;

  const handleViewDetails = (order: Order) => {
    setSelectedProduct(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleApproveOrder = async (order: Order) => {
    try {
      setIsApproving(order.order_id);
      
      // Call the order confirmation API
      const response = await fetch(`http://localhost:8000/api/v1/orders/${order.id}/confirm/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Order Approved!",
          description: "Payment has been released to the vendor. Thank you for your purchase!",
        });
        
        // Refresh the page to update order status
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to approve order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: "Error",
        description: "Failed to approve order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(null);
    }
  };

  return (
    <>
      <Card className="border border-gray-700 bg-gray-900">
        {!compact && (
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Your Orders
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? "p-0" : ""}>
          <div className="space-y-4">
            {displayOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
                <p className="text-gray-400">You haven't placed any orders yet.</p>
              </div>
            ) : (
              displayOrders.map((order) => {
                const orderDate = new Date(order.created_at);
                const formattedDate = orderDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                });

                return (
                  <div 
                    key={order.order_id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(order.order_status)}`}>
                        {getStatusIcon(order.order_status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {order.product.headline}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {order.vendor.username} • {formattedDate}
                        </p>
                        
                        {/* Credentials Display - Only for paid orders */}
                        {order.product_credentials && Object.keys(order.product_credentials).length > 0 && order.order_status === 'paid' && (
                          <div className="mt-2">
                            <button 
                              onClick={() => {
                                // Extract credentials data
                                const credentialsData = order.product_credentials.credentials || 'No credentials available';
                                const releaseDate = order.product_credentials.released_at || order.created_at;
                                const productHeadline = order.product.headline || 'product';
                                
                                // Create modal element
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
                                modal.style.animation = 'fadeIn 0.2s ease-out';
                                
                                // Add CSS animation
                                const style = document.createElement('style');
                                style.textContent = `
                                  @keyframes fadeIn {
                                    from { opacity: 0; }
                                    to { opacity: 1; }
                                  }
                                  .credentials-hidden { 
                                    filter: blur(4px); 
                                    transition: all 0.3s ease; 
                                  }
                                  .credentials-visible { 
                                    filter: none; 
                                    transition: all 0.3s ease; 
                                  }
                                `;
                                document.head.appendChild(style);
                                
                                modal.innerHTML = `
                                  <div class="bg-gray-900 border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                                    <div class="flex items-center justify-between p-6 border-b border-gray-600/20">
                                      <div>
                                        <h2 class="text-xl font-bold text-white">Product Credentials</h2>
                                        <p class="text-sm text-gray-400 mt-1">${productHeadline}</p>
                                      </div>
                                      <button id="closeModal" class="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                                      <div class="space-y-6">
                                        <!-- Release Information -->
                                        <div class="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                                          <div class="flex items-center space-x-2 mb-2">
                                            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1M8 7h8m-8 0l-2 14h12l-2-14M8 7v1a2 2 0 002 2h4a2 2 0 002-2V7"></path>
                                            </svg>
                                            <span class="text-sm font-medium text-blue-300">Release:</span>
                                          </div>
                                          <p class="text-sm text-gray-300">
                                            <span class="text-gray-400">Released on:</span> 
                                            ${new Date(releaseDate).toLocaleString('en-US', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>

                                        <!-- Credentials Section -->
                                        <div class="bg-gray-800/50 rounded-lg p-4">
                                          <div class="flex items-center justify-between mb-4">
                                            <div class="flex items-center space-x-2">
                                              <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2 2 2 0 01-2 2m-2-4a2 2 0 00-2-2m0 0a2 2 0 00-2 2m0 0a2 2 0 002 2m0 0a2 2 0 002-2m0 0a2 2 0 00-2-2m0 0a2 2 0 00-2 2"></path>
                                              </svg>
                                              <span class="text-sm font-medium text-green-300">Account Credentials</span>
                                            </div>
                                            <button id="toggleVisibility" class="flex items-center space-x-2 px-3 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-lg transition-colors text-green-400 hover:text-green-300">
                                              <svg id="eyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                              </svg>
                                              <span id="toggleText">Show</span>
                                            </button>
                                          </div>
                                          
                                          <div class="relative">
                                            <pre id="credentialsText" class="text-white font-mono text-sm whitespace-pre-wrap break-all p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 credentials-hidden min-h-[100px] overflow-auto">${credentialsData}</pre>
                                            <div id="blurOverlay" class="absolute inset-0 flex items-center justify-center">
                                              <span class="text-gray-400 font-medium">Click "Show" to reveal credentials</span>
                                            </div>
                                          </div>
                                        </div>

                                        <!-- Action Buttons -->
                                        <div class="flex justify-center space-x-4">
                                          <button id="copyBtn" class="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                            </svg>
                                            <span>Copy</span>
                                          </button>
                                          
                                          <button id="downloadBtn" class="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span>Download</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                `;
                                
                                document.body.appendChild(modal);
                                
                                // Add functionality
                                let isVisible = false;
                                const credentialsText = modal.querySelector('#credentialsText');
                                const blurOverlay = modal.querySelector('#blurOverlay');
                                const toggleBtn = modal.querySelector('#toggleVisibility');
                                const eyeIcon = modal.querySelector('#eyeIcon');
                                const toggleText = modal.querySelector('#toggleText');
                                const copyBtn = modal.querySelector('#copyBtn');
                                const downloadBtn = modal.querySelector('#downloadBtn');
                                const closeBtn = modal.querySelector('#closeModal');
                                
                                // Toggle visibility
                                toggleBtn?.addEventListener('click', () => {
                                  isVisible = !isVisible;
                                  
                                  if (isVisible) {
                                    credentialsText?.classList.remove('credentials-hidden');
                                    credentialsText?.classList.add('credentials-visible');
                                    blurOverlay.style.display = 'none';
                                    toggleText.textContent = 'Hide';
                                    eyeIcon.innerHTML = `
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                                    `;
                                  } else {
                                    credentialsText?.classList.remove('credentials-visible');
                                    credentialsText?.classList.add('credentials-hidden');
                                    blurOverlay.style.display = 'flex';
                                    toggleText.textContent = 'Show';
                                    eyeIcon.innerHTML = `
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                    `;
                                  }
                                });
                                
                                // Copy functionality
                                copyBtn?.addEventListener('click', async () => {
                                  try {
                                    await navigator.clipboard.writeText(credentialsData);
                                    copyBtn.innerHTML = `
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                      <span>Copied!</span>
                                    `;
                                    setTimeout(() => {
                                      copyBtn.innerHTML = `
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                        <span>Copy</span>
                                      `;
                                    }, 2000);
                                  } catch (err) {
                                    console.error('Copy failed:', err);
                                  }
                                });
                                
                                // Download functionality
                                downloadBtn?.addEventListener('click', () => {
                                  const timestamp = new Date().toISOString().slice(0, 10);
                                  const filename = `${productHeadline.replace(/[^a-z0-9]/gi, '_')}_credentials_${timestamp}.txt`;
                                  const content = `Product: ${productHeadline}\\nOrder ID: ${order.order_id}\\nReleased: ${new Date(releaseDate).toLocaleString()}\\n\\nCredentials:\\n${credentialsData}`;
                                  
                                  const blob = new Blob([content], { type: 'text/plain' });
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                  
                                  downloadBtn.innerHTML = `
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>Downloaded!</span>
                                  `;
                                  setTimeout(() => {
                                    downloadBtn.innerHTML = `
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                      </svg>
                                      <span>Download</span>
                                    `;
                                  }, 2000);
                                });
                                
                                // Close functionality
                                closeBtn?.addEventListener('click', () => {
                                  modal.remove();
                                  style.remove();
                                });
                                
                                // Click outside to close
                                modal.addEventListener('click', (e) => {
                                  if (e.target === modal) {
                                    modal.remove();
                                    style.remove();
                                  }
                                });
                                
                                // Escape key to close
                                const handleEscape = (e) => {
                                  if (e.key === 'Escape') {
                                    modal.remove();
                                    style.remove();
                                    document.removeEventListener('keydown', handleEscape);
                                  }
                                };
                                document.addEventListener('keydown', handleEscape);
                              }}
                              className="text-xs text-green-400 hover:text-green-300 underline cursor-pointer"
                            >
                              View credentials
                            </button>
                          </div>
                        )}

                        {/* Escrow Badge */}
                        {order.use_escrow && (
                          <div className="mt-2">
                            <Badge className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black border border-yellow-400/60 shadow-lg">
                              <Lock className="w-3 h-3 mr-1" />
                              ESCROW PROTECTED
                            </Badge>
                          </div>
                        )}

                        {/* Escrow Approval Button - Only for escrow orders in paid status */}
                        {order.use_escrow && order.order_status === 'paid' && (
                          <div className="mt-2 p-2 bg-green-500/5 border border-green-500/20 rounded max-w-md">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-1">
                                <Lock className="w-3 h-3 text-green-400" />
                                <span className="text-xs font-medium text-green-300">Escrow Active</span>
                              </div>
                              <Button
                                onClick={() => handleApproveOrder(order)}
                                disabled={isApproving === order.order_id}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-6"
                              >
                                {isApproving === order.order_id ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-gray-400">
                              Test your product and approve to release payment
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {order.total_amount} {order.crypto_currency}
                        </p>
                        <Badge 
                          className={`text-xs ${getStatusColor(order.order_status)}`}
                          variant="secondary"
                        >
                          {getStatusDisplay(order.order_status)}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Track Order</DropdownMenuItem>
                          {order.order_status === "completed" && (
                            <DropdownMenuItem>Leave Review</DropdownMenuItem>
                          )}
                          {(order.order_status === "processing" || order.order_status === "pending") && (
                            <DropdownMenuItem className="text-red-600">Cancel Order</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Modal */}
      {isModalOpen && selectedProduct && (
        <OrderProductModal
          order={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}