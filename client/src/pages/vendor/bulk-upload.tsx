import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastContainer";
import vendorService from "@/services/vendorService";

interface BulkUploadResult {
  success: boolean;
  message: string;
  total: number;
  successful: number;
  failed: number;
  errors?: string[];
}

export default function BulkUpload() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [uploadType, setUploadType] = useState<'csv' | 'simple'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [simpleData, setSimpleData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [nonEscrowBlocked, setNonEscrowBlocked] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await vendorService.getBulkUploadTemplate();
      if (response.success) {
        // Convert template data to CSV format
        const template = response.data;

        // Helper function to properly escape CSV values
        const escapeCSV = (value: string) => {
          // If value contains comma, newline, or quote, wrap in quotes and escape quotes
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        const headers = template.headers.map(escapeCSV).join(',');
        const sampleRow = template.sample_data.map(escapeCSV).join(',');
        const csvContent = `${headers}\n${sampleRow}`;

        // Create and download the template file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Account_upload_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast({
          type: 'success',
          title: 'Template Downloaded',
          message: 'CSV template has been downloaded successfully.',
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: error.message || 'Failed to download template',
      });
    }
  };

  const handleUpload = async () => {
    // Check if vendor has setup BTC and XMR addresses
    try {
      const profileResponse = await vendorService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data;
        const btcAddress = userData.btc_payout_address || userData.btc_address;
        const xmrAddress = userData.xmr_payout_address || userData.xmr_address;

        if (userData.non_escrow_blocked) {
          setNonEscrowBlocked(true);
        }

        if (!btcAddress || !xmrAddress) {
          showToast({
            type: 'error',
            title: 'Setup Required',
            message: 'Please setup your btc and xmr in the setting first',
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error checking profile settings:', error);
      // If we can't check, we might want to block or allow with warning. 
      // Safe to block to ensure compliance with user request.
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not verify wallet settings. Please try again.',
      });
      return;
    }

    if (uploadType === 'csv' && !file) {
      showToast({
        type: 'error',
        title: 'No File Selected',
        message: 'Please select a CSV file to upload.',
      });
      return;
    }

    if (uploadType === 'simple' && !simpleData.trim()) {
      showToast({
        type: 'error',
        title: 'No Data',
        message: 'Please enter account data.',
      });
      return;
    }

    try {
      setUploading(true);
      setResult(null);

      let response;
      if (uploadType === 'csv') {
        response = await vendorService.bulkUploadCSV(file!);
      } else {
        response = await vendorService.bulkUploadSimple(simpleData);
      }

      if (response.success) {
        // Transform the response to match the expected format
        const transformedResult = {
          success: response.success,
          message: response.message,
          total: response.products_created + (response.errors?.length || 0),
          successful: response.products_created,
          failed: response.errors?.length || 0,
          errors: response.errors || []
        };
        setResult(transformedResult);
        showToast({
          type: 'success',
          title: 'Upload Successful',
          message: `Successfully uploaded ${response.products_created} accounts.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Upload Failed',
          message: response.message || 'Failed to upload accounts',
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Upload Error',
        message: error.message || 'An error occurred during upload',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/vendor/listings')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Button>
          <div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2">Bulk Upload Accounts</h1>
            <p className="text-gray-400 italic">Upload multiple accounts at once</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Upload Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Type Selection */}
            <div className="space-y-2">
              <Label className="text-white">Upload Method</Label>
              <Select value={uploadType} onValueChange={(value: 'csv' | 'simple') => setUploadType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV File Upload</SelectItem>
                  <SelectItem value="simple">Simple Text Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CSV Upload */}
            {uploadType === 'csv' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">CSV File</Label>
                  <div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors"
                    onClick={() => document.getElementById('csv-upload')?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-theme-cyan');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-theme-cyan');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-theme-cyan');
                      const droppedFile = e.dataTransfer.files[0];
                      if (droppedFile && droppedFile.name.endsWith('.csv')) {
                        setFile(droppedFile);
                      }
                    }}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 mb-2">Drag and drop your CSV file here, or click to browse</p>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('csv-upload')?.click();
                      }}
                    >
                      Choose File
                    </Button>
                  </div>
                  {file && (
                    <p className="text-sm text-green-400">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {file.name} selected
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            )}

            {/* Simple Text Upload */}
            {uploadType === 'simple' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Account Data</Label>
                  <Textarea
                    placeholder="Enter accounts data in simple format..."
                    value={simpleData}
                    onChange={(e) => setSimpleData(e.target.value)}
                    className="min-h-[200px]"
                    rows={10}
                  />
                  <p className="text-sm text-gray-400">
                    Format: Account Name | Website | Account Type | Price (USD) | Description | Credentials | Quantity | Escrow (true/false)
                  </p>
                </div>
              </div>
            )}

            {nonEscrowBlocked && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-400 font-semibold text-sm">Escrow Only Mode</h4>
                  <p className="text-red-400/80 text-xs">
                    You can only upload escrow accounts. Please ensure "escrow_enabled" is set to "true" in your data.
                  </p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-theme-cyan hover:bg-theme-cyan/80 text-black font-bold"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Accounts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadType === 'csv' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Headline (required)</li>
                    <li>• Website (required)</li>
                    <li>• Account Type (required)</li>
                    <li>• Access Type (required)</li>
                    <li>• Description (required)</li>
                    <li>• Price (required)</li>
                    <li>• Credentials (required) - JSON format: {`{"username":"v","password":"v"}`}</li>
                    <li>• Delivery Time (required)</li>
                    <li>• Account Quantity (optional, default: 1)</li>
                    <li>• Escrow Enabled (optional, default: false)</li>
                    <li>• Additional Info (optional)</li>
                    <li>• Account Balance (optional)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Tips:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Use commas to separate fields</li>
                    <li>• Enclose text fields in quotes if they contain commas</li>
                    <li>• Credentials must be in valid JSON format</li>
                    <li>• Ensure all required fields are filled</li>
                    <li>• Maximum 100 Accounts per upload</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Simple Format:</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter one account per line using this format:
                  </p>
                  <code className="block bg-gray-800 p-2 rounded text-xs text-theme-cyan font-mono whitespace-pre-wrap">
                    Account Name | Website | Account Type | Price | Description | Credentials | Quantity | Escrow
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Required Fields:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Account Name (required)</li>
                    <li>• Website (required)</li>
                    <li>• Account Type (required)</li>
                    <li>• Price (required) - e.g. 15.00 (USD price is preferred)</li>
                    <li>• Description (required)</li>
                    <li>• Credentials (required) - JSON format: {`{"username":"value","password":"value"}`}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Example:</h4>
                  <code className="block bg-gray-800 p-2 rounded text-xs text-theme-cyan font-mono whitespace-pre-wrap break-words">
                    Premium Netflix | netflix.com | streaming | 15.00 | 4K Ultra HD | {`{"u":"n","p":"pw"}`} | 5 | true
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Tips:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Use pipe (|) to separate fields</li>
                    <li>• Credentials must be in valid JSON format</li>
                    <li>• All fields are required</li>
                    <li>• One Account per line</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-cyan">{result.total}</div>
                <p className="text-sm text-gray-400">Total Accounts</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-cyan">{result.successful}</div>
                <p className="text-sm text-gray-400">Successful</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-red">{result.failed}</div>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-white mb-2">Errors:</h4>
                <div className="space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
