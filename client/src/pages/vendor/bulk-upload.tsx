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
        // Create and download the template file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_upload_template.csv';
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
        message: 'Please enter product data.',
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
        setResult(response.data);
        showToast({
          type: 'success',
          title: 'Upload Successful',
          message: `Successfully uploaded ${response.data.successful} products.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Upload Failed',
          message: response.message || 'Failed to upload products',
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
            <h1 className="text-3xl font-bold text-white">Bulk Upload Products</h1>
            <p className="text-gray-400">Upload multiple products at once</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="border border-gray-700 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Upload Products</CardTitle>
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
                      e.currentTarget.classList.add('border-blue-500');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-blue-500');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-500');
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
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
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
                  <Label className="text-white">Product Data</Label>
                  <Textarea
                    placeholder="Enter product data in simple format..."
                    value={simpleData}
                    onChange={(e) => setSimpleData(e.target.value)}
                    className="min-h-[200px]"
                    rows={10}
                  />
                  <p className="text-sm text-gray-400">
                    Format: Product Name | Website | Account Type | Price | Description
                  </p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Products
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
                    <li>• Delivery Time (required)</li>
                    <li>• Credentials (required)</li>
                    <li>• Account Balance (optional)</li>
                    <li>• Additional Info (optional)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Tips:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Use commas to separate fields</li>
                    <li>• Enclose text fields in quotes if they contain commas</li>
                    <li>• Ensure all required fields are filled</li>
                    <li>• Maximum 100 products per upload</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Simple Format:</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter one product per line using this format:
                  </p>
                  <code className="block bg-gray-800 p-2 rounded text-xs text-green-400">
                    Product Name | Website | Account Type | Price | Description
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Example:</h4>
                  <code className="block bg-gray-800 p-2 rounded text-xs text-green-400">
                    Premium Netflix Account | netflix.com | streaming | 15.00 | 4K Ultra HD Netflix account with premium features
                  </code>
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
                <div className="text-2xl font-bold text-blue-500">{result.total}</div>
                <p className="text-sm text-gray-400">Total Products</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{result.successful}</div>
                <p className="text-sm text-gray-400">Successful</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{result.failed}</div>
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