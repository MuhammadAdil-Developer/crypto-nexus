
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Upload, Save, RotateCcw, Eye, Download } from "lucide-react";

export default function AdminBranding() {

  const colorThemes = [
    { name: "Default Blue", primary: "#22D3EE", secondary: "#0B0F14", accent: "#1E40AF" },
    { name: "Purple Night", primary: "#8B5CF6", secondary: "#0F0A1A", accent: "#6D28D9" },
    { name: "Green Matrix", primary: "#10B981", secondary: "#0A0F0A", accent: "#059669" },
    { name: "Orange Sunset", primary: "#F59E0B", secondary: "#1A0F0A", accent: "#D97706" },
    { name: "Red Alert", primary: "#EF4444", secondary: "#1A0A0A", accent: "#DC2626" }
  ];

  return (
    
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Branding & Customization</h1>
            <p className="text-gray-300 mt-1">Customize your marketplace appearance and branding</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button className="bg-accent text-bg hover:bg-accent-2">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Palette className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Active Theme</p>
                  <p className="text-2xl font-bold text-white">Dark</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center mr-4">
                  <Upload className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Custom Assets</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-warning font-bold">%</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Customization</p>
                  <p className="text-2xl font-bold text-white">85%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="crypto-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Download className="w-8 h-8 text-accent mr-4" />
                <div>
                  <p className="text-sm text-gray-400">Last Backup</p>
                  <p className="text-2xl font-bold text-white">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-surface-2 mb-6">
            <TabsTrigger value="general" className="text-gray-300 data-[state=active]:text-white">
              General Settings
            </TabsTrigger>
            <TabsTrigger value="colors" className="text-gray-300 data-[state=active]:text-white">
              Colors & Theme
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-gray-300 data-[state=active]:text-white">
              Logo & Assets
            </TabsTrigger>
            <TabsTrigger value="pages" className="text-gray-300 data-[state=active]:text-white">
              Custom Pages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Site Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="siteName" className="text-white">Site Name</Label>
                      <Input 
                        id="siteName"
                        defaultValue="CryptoMarket"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="site-name-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="siteTagline" className="text-white">Tagline</Label>
                      <Input 
                        id="siteTagline"
                        defaultValue="Anonymous Digital Marketplace"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="site-tagline-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="siteDescription" className="text-white">Description</Label>
                      <Textarea 
                        id="siteDescription"
                        defaultValue="Secure, anonymous marketplace for digital goods and services. Privacy-focused trading with cryptocurrency payments."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="site-description-input"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="supportEmail" className="text-white">Support Email</Label>
                      <Input 
                        id="supportEmail"
                        defaultValue="support@cryptomarket.onion"
                        className="mt-2 bg-surface-2 border-border text-white"
                        data-testid="support-email-input"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Dark Mode Default</p>
                        <p className="text-sm text-gray-400">Default to dark theme for new visitors</p>
                      </div>
                      <Switch defaultChecked data-testid="dark-mode-toggle" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Show Marketplace Stats</p>
                        <p className="text-sm text-gray-400">Display user counts and listing stats on homepage</p>
                      </div>
                      <Switch defaultChecked data-testid="stats-toggle" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Enable Custom Footer</p>
                        <p className="text-sm text-gray-400">Show custom footer with additional links</p>
                      </div>
                      <Switch data-testid="footer-toggle" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Maintenance Mode</p>
                        <p className="text-sm text-gray-400">Display maintenance page to public users</p>
                      </div>
                      <Switch data-testid="maintenance-toggle" />
                    </div>
                    
                    <div>
                      <Label htmlFor="timezone" className="text-white">Timezone</Label>
                      <select 
                        id="timezone"
                        className="mt-2 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-white"
                        data-testid="timezone-select"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Berlin">Berlin</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="colors">
            <div className="space-y-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Color Theme</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {colorThemes.map((theme, index) => (
                      <div 
                        key={index} 
                        className="border border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors"
                        data-testid={`color-theme-${index}`}
                      >
                        <div className="flex space-x-2 mb-3">
                          <div 
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: theme.primary }}
                          ></div>
                          <div 
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: theme.secondary }}
                          ></div>
                          <div 
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: theme.accent }}
                          ></div>
                        </div>
                        <p className="text-sm text-white font-medium">{theme.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Custom Colors</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="primaryColor" className="text-white">Primary Color</Label>
                      <div className="mt-2 flex space-x-2">
                        <Input 
                          id="primaryColor"
                          type="color"
                          defaultValue="#22D3EE"
                          className="w-16 h-10 p-1 bg-surface-2 border-border"
                          data-testid="primary-color-picker"
                        />
                        <Input 
                          defaultValue="#22D3EE"
                          className="flex-1 bg-surface-2 border-border text-white"
                          data-testid="primary-color-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="accentColor" className="text-white">Accent Color</Label>
                      <div className="mt-2 flex space-x-2">
                        <Input 
                          id="accentColor"
                          type="color"
                          defaultValue="#1E40AF"
                          className="w-16 h-10 p-1 bg-surface-2 border-border"
                          data-testid="accent-color-picker"
                        />
                        <Input 
                          defaultValue="#1E40AF"
                          className="flex-1 bg-surface-2 border-border text-white"
                          data-testid="accent-color-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="backgroundColor" className="text-white">Background Color</Label>
                      <div className="mt-2 flex space-x-2">
                        <Input 
                          id="backgroundColor"
                          type="color"
                          defaultValue="#0B0F14"
                          className="w-16 h-10 p-1 bg-surface-2 border-border"
                          data-testid="background-color-picker"
                        />
                        <Input 
                          defaultValue="#0B0F14"
                          className="flex-1 bg-surface-2 border-border text-white"
                          data-testid="background-color-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="successColor" className="text-white">Success Color</Label>
                      <div className="mt-2 flex space-x-2">
                        <Input 
                          id="successColor"
                          type="color"
                          defaultValue="#10B981"
                          className="w-16 h-10 p-1 bg-surface-2 border-border"
                          data-testid="success-color-picker"
                        />
                        <Input 
                          defaultValue="#10B981"
                          className="flex-1 bg-surface-2 border-border text-white"
                          data-testid="success-color-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="warningColor" className="text-white">Warning Color</Label>
                      <div className="mt-2 flex space-x-2">
                        <Input 
                          id="warningColor"
                          type="color"
                          defaultValue="#F59E0B"
                          className="w-16 h-10 p-1 bg-surface-2 border-border"
                          data-testid="warning-color-picker"
                        />
                        <Input 
                          defaultValue="#F59E0B"
                          className="flex-1 bg-surface-2 border-border text-white"
                          data-testid="warning-color-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="dangerColor" className="text-white">Danger Color</Label>
                      <div className="mt-2 flex space-x-2">
                        <Input 
                          id="dangerColor"
                          type="color"
                          defaultValue="#EF4444"
                          className="w-16 h-10 p-1 bg-surface-2 border-border"
                          data-testid="danger-color-picker"
                        />
                        <Input 
                          defaultValue="#EF4444"
                          className="flex-1 bg-surface-2 border-border text-white"
                          data-testid="danger-color-input"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex space-x-3">
                    <Button variant="outline" className="border-border text-gray-300 hover:bg-surface-2" data-testid="reset-colors">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Default
                    </Button>
                    <Button className="bg-accent text-bg hover:bg-accent-2" data-testid="apply-colors">
                      Apply Colors
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assets">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Logo & Brand Assets</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-white">Site Logo</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">Upload logo (PNG, SVG recommended)</p>
                        <p className="text-sm text-gray-500">Optimal size: 200x60px</p>
                        <Button variant="outline" className="mt-3 border-border text-gray-300" data-testid="upload-logo">
                          Choose File
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-white">Favicon</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <div className="w-8 h-8 bg-accent/20 rounded mx-auto mb-3"></div>
                        <p className="text-gray-400 mb-2">Upload favicon (ICO, PNG)</p>
                        <p className="text-sm text-gray-500">Size: 32x32px or 16x16px</p>
                        <Button variant="outline" className="mt-3 border-border text-gray-300" data-testid="upload-favicon">
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Additional Assets</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-white">Hero Background</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <div className="w-16 h-10 bg-gradient-to-r from-accent/20 to-accent/40 rounded mx-auto mb-3"></div>
                        <p className="text-gray-400 mb-2">Homepage hero background</p>
                        <p className="text-sm text-gray-500">Recommended: 1920x600px</p>
                        <Button variant="outline" className="mt-3 border-border text-gray-300" data-testid="upload-hero">
                          Choose File
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-white">Loading Animation</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-gray-400 mb-2">Custom loading spinner</p>
                        <p className="text-sm text-gray-500">SVG or GIF, 64x64px max</p>
                        <Button variant="outline" className="mt-3 border-border text-gray-300" data-testid="upload-spinner">
                          Choose File
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-white">Email Header</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <div className="w-16 h-6 bg-accent/20 rounded mx-auto mb-3"></div>
                        <p className="text-gray-400 mb-2">Email template header</p>
                        <p className="text-sm text-gray-500">600x150px recommended</p>
                        <Button variant="outline" className="mt-3 border-border text-gray-300" data-testid="upload-email-header">
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pages">
            <div className="space-y-6">
              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Custom Pages</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="aboutPage" className="text-white">About Page Content</Label>
                      <Textarea 
                        id="aboutPage"
                        placeholder="Tell users about your marketplace..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={6}
                        data-testid="about-page-content"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="termsPage" className="text-white">Terms of Service</Label>
                      <Textarea 
                        id="termsPage"
                        placeholder="Enter your terms of service..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={6}
                        data-testid="terms-page-content"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="privacyPage" className="text-white">Privacy Policy</Label>
                      <Textarea 
                        id="privacyPage"
                        placeholder="Enter your privacy policy..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={6}
                        data-testid="privacy-page-content"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="faqPage" className="text-white">FAQ Content</Label>
                      <Textarea 
                        id="faqPage"
                        placeholder="Frequently asked questions and answers..."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={6}
                        data-testid="faq-page-content"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="crypto-card">
                <CardHeader>
                  <CardTitle className="text-white">Maintenance & Error Pages</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="maintenancePage" className="text-white">Maintenance Page Message</Label>
                      <Textarea 
                        id="maintenancePage"
                        placeholder="We're currently performing maintenance. Please check back soon."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="maintenance-page-content"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="errorPage" className="text-white">404 Error Page Message</Label>
                      <Textarea 
                        id="errorPage"
                        placeholder="The page you're looking for doesn't exist."
                        className="mt-2 bg-surface-2 border-border text-white"
                        rows={4}
                        data-testid="error-page-content"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    
  );
}