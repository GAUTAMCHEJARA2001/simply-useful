import sys

file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\src\pages\AdminOnboardingPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert the extended data display block just before "Uploaded Documents" section
extended_data_display = """
              {selectedRequest.extendedData && (
                <div className="bg-white border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Extended Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-2">Banking & Status</h4>
                      <ul className="text-sm space-y-1">
                        <li><span className="text-gray-500">Bank Name:</span> {selectedRequest.extendedData.bankName || '-'}</li>
                        <li><span className="text-gray-500">Account No:</span> {selectedRequest.extendedData.bankAccountNo || '-'} ({selectedRequest.extendedData.bankAccountType})</li>
                        <li><span className="text-gray-500">Signatory:</span> {selectedRequest.extendedData.bankSignatory || '-'}</li>
                        <li><span className="text-gray-500">Firm Status:</span> {selectedRequest.extendedData.firmStatus || '-'}</li>
                        <li><span className="text-gray-500">Assoc. Firms:</span> {selectedRequest.extendedData.associateFirms || '-'}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-2">Operations & Turnover</h4>
                      <ul className="text-sm space-y-1">
                        <li><span className="text-gray-500">Turnover (Y1/Y2/Y3):</span> {selectedRequest.extendedData.turnoverLast3Years?.join(' / ') || '-'}</li>
                        <li><span className="text-gray-500">Employees:</span> {selectedRequest.extendedData.personsEmployed || '-'}</li>
                        <li><span className="text-gray-500">Godown:</span> {selectedRequest.extendedData.hasGodown ? `Yes (${selectedRequest.extendedData.godownCapacity} sqft, ${selectedRequest.extendedData.godownOwnership})` : 'No'}</li>
                        <li><span className="text-gray-500">Reg. Dealer:</span> {selectedRequest.extendedData.isRegisteredDealer ? 'Yes' : 'No'}</li>
                      </ul>
                    </div>
                    
                    {selectedRequest.extendedData.proprietorDetails?.length > 0 && (
                      <div className="col-span-1 md:col-span-2">
                        <h4 className="font-medium text-sm text-gray-500 mb-2">Partners / Directors</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50"><tr><th className="px-2 py-1">Name</th><th className="px-2 py-1">Age</th><th className="px-2 py-1">Address</th></tr></thead>
                            <tbody>
                              {selectedRequest.extendedData.proprietorDetails.map((p: any, i: number) => (
                                <tr key={i} className="border-b"><td className="px-2 py-1">{p.name}</td><td className="px-2 py-1">{p.age}</td><td className="px-2 py-1">{p.address}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {selectedRequest.extendedData.securityDeposit && (
                      <div className="col-span-1 md:col-span-2 bg-yellow-50 p-2 rounded">
                        <h4 className="font-medium text-sm text-yellow-800 mb-1">Security Deposit Details</h4>
                        <p className="text-sm">DD/Cheque: <b>{selectedRequest.extendedData.securityDeposit.ddChequeNo || '-'}</b> | Bank: <b>{selectedRequest.extendedData.securityDeposit.bank || '-'}</b> | Payable At: <b>{selectedRequest.extendedData.securityDeposit.payableAt || '-'}</b></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
"""

content = content.replace("              <div>\n                <h3 className=\"font-semibold text-lg mb-4 border-b pb-2\">Uploaded Documents</h3>", extended_data_display + '                <h3 className="font-semibold text-lg mb-4 border-b pb-2">Uploaded Documents</h3>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched AdminOnboardingPage.tsx successfully")
