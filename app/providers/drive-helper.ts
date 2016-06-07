import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import {AuthHelper} from '../providers/auth-helper';

@Injectable()
export class DriveHelper {
    constructor(
        private authHelper: AuthHelper,
        private http: Http) {
            this.expensesFolderId = window.localStorage.getItem('CACHE_KEY_FOLDER');
            this.workbookItemId = window.localStorage.getItem('CACHE_KEY_WORKBOOK');
    }
    
    workbookItemId: string;
    expensesFolderId: string;

    //gets all items from a OneDrive folder at the specified URI
    getItems(uri: string) {
        //ensure the app folder and Excel data source exists
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
               helper.http.get(uri, {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                   // Check the response status
                  if (res.status === 200)
                    resolve(res.json().value);
                  else
                    reject('Error calling MS Graph');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //ensures a folder of a specific name and path exists
    ensureFolder(uri: string, folderName: string) {
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.getItems(uri).then(function(response: Array<any>) {
                //loop through items and look for the folder
                var folderId = null;
                for (var i = 0; i < response.length; i++) {
                    if (response[i].name === folderName) {
                        folderId = response[i].id;
                        break;   
                    }
                }
                
                //check if folder was found
                if (folderId != null) {
                    //resolve the folder id
                    resolve(folderId);
                }
                else {
                    //create the folder
                    helper.createFolder(uri, folderName).then(function(id: string) {
                        resolve(id);
                    }, function(err) {
                        reject(err);
                    });
                }
            }, function (err) {
                reject(err);
            });
        });
    }
    
    //ensures the "Expenses.xslx" file exists in the "MyExpenses" folder specified
    ensureWorkbook(myExpensesFolderId: string) {
        //ensure the Excel Workbookexists
        let helper = this;
        return new Promise((resolve, reject) => {
            //check for Expenses.xlsx files
            helper.getItems('https://graph.microsoft.com/v1.0/me/drive/items/' + myExpensesFolderId + '/children').then(function(response: Array<any>) {
                //loop through the results and look for the Expenses.xlsx workbook
                var datasourceId = null;
                for (var i = 0; i < response.length; i++) {
                    if (response[i].name === 'Expenses.xlsx') {
                        datasourceId = response[i].id;
                        break;   
                    }
                }
                
                //check if workbook was found
                if (datasourceId != null) {
                    //resolve the id
                    resolve(datasourceId);
                }
                else {
                    //create the files
                    helper.createWorkbook(myExpensesFolderId).then(function(datasourceId: String) {
                        resolve(datasourceId);
                    }, function(err) {
                        reject(err);
                    });
                }
            }, function (err) {
                reject(err);
            });
        });
    }
    
    //ensures all the configuration information is in place for the app
    ensureConfig() {
        //ensure all the folders and files are setup
        let helper = this;
        return new Promise((resolve, reject) => {
            let uri = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
            helper.ensureFolder(uri, 'Apps').then(function(appFolderId: string) {
                uri = 'https://graph.microsoft.com/v1.0/me/drive/items/' + appFolderId + '/children';
                helper.ensureFolder(uri, 'MyExpenses').then(function(myExpensesFolderId: string) {
                    helper.expensesFolderId = myExpensesFolderId;
                    window.localStorage.setItem('CACHE_KEY_FOLDER', myExpensesFolderId);
                    helper.ensureWorkbook(myExpensesFolderId).then(function(datasourceId: string) {
                        helper.workbookItemId = datasourceId;
                        window.localStorage.setItem('CACHE_KEY_WORKBOOK', datasourceId);                        
                        resolve(true);
                    }, function(err) {
                        reject(err);
                    }) 
                }, function(err) {
                    reject(err);
                });
            }, function(err) {
                reject(err);
            });
        });
    }
    
    //creates a folder at the specified URI with the specified name 
    createFolder(uri: string, name: string) {
        //adds a folder to a specific path and name
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
                //configure headers for API call
                let headers = new Headers();
                headers.append('Authorization', 'Bearer ' + token.accessToken);
                headers.append('Content-Type', 'application/json');
                let data = JSON.stringify({ name: name, folder: { } });
               
                //perform the HTTP POST
                helper.http.post(uri, data, { headers: headers })
                    .subscribe(res => {
                        // Check the response status
                        if (res.status === 201)
                            resolve(res.json().id);
                        else
                            reject('Create folder failed');
                    });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //uploads a file to the MyExpenses folder
    uploadFile(base64: string, name: string) {
        //adds a folder to a specific path and name
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
                //convert base64 string to binary
                let binary = helper.getBinaryFileContents(base64);
                
                //prepare the request
                let req = new XMLHttpRequest();
                req.open('PUT', 'https://graph.microsoft.com/v1.0/me/drive/items/' + helper.expensesFolderId + '/children/' + name + '/content', false);
                req.setRequestHeader('Content-type', 'application/octet-stream');
                req.setRequestHeader('Content-length', binary.length.toString());
                req.setRequestHeader('Authorization', 'Bearer ' + token.accessToken);
                req.setRequestHeader('Accept', 'application/json;odata.metadata=full');
                req.send(binary);
                            
                //check response
                if (req.status === 201)
                    resolve(JSON.parse(req.responseText).id); //resolve id of new file
                else
                    reject('Failed to upload file');
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //creates the "Expenses.xslx" workbook in the "MyExpenses" folder specified
    createWorkbook(folderId: string) {
        //adds a the workbook to OneDrive
        let helper = this;
        return new Promise((resolve, reject) => {
            //get token for resource
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
                //reference the Excel document template at the root application www directory
                window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + 'www/Expenses.xlsx', function (fileEntry) {
                    fileEntry.file(function (file) {
                        //open the file with a FileReader
                        var reader = new FileReader();
                        reader.onloadend = function(evt: ProgressEvent) {
                            //read base64 file and convert to binary
                            let base64 = evt.target.result;
                            base64 = base64.substring(base64.indexOf(',') + 1);
                            
                            //perform the PUT
                            helper.uploadFile(base64, 'Expenses.xlsx').then(function(id: string) {
                                resolve(id);
                            }, function(err) {
                                reject(err);
                            });
                        };
  
                        //catch read errors
                        reader.onerror = function(err) {
                            reject('Error loading file'); 
                        };
                        
                        //read the file as an ArrayBuffer
                        reader.readAsDataURL(file);
                    }, 
                    function(err) {
                        reject('Error opening file');
                    });
                }, function(err) {
                    reject('Error resolving file on file system');
                });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //converts a base64 string to binary array of type Uint8Array for uploading
    getBinaryFileContents(base64FileContents: string) {  
        var raw = window.atob(base64FileContents);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));

        for(var i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }

        return array;
    }
    
    //gets rows from the Expenses.xslx workbook
    getRows() {
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
               helper.http.get('https://graph.microsoft.com/beta/me/drive/items/' + helper.workbookItemId + '/workbook/worksheets(\'Sheet1\')/tables(\'Table1\')/rows', {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                  // Check the response status before trying to resolve
                  if (res.status === 200)
                     resolve(res.json().value);
                  else
                     reject('Get rows failed');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //adds a row to the Excel datasource
    addRow(rowData: any) {
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
               helper.http.post('https://graph.microsoft.com/beta/me/drive/items/' + helper.workbookItemId + '/workbook/worksheets(\'Sheet1\')/tables(\'Table1\')/rows', JSON.stringify(rowData), {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                  // Check the response status before trying to resolve
                  if (res.status === 201)
                     resolve();
                  else
                     reject('Get rows failed');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //updates a row in the Excel datasource
    updateRow(index:number, rowData:any) {
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
               let address = 'Sheet1!A' + (index + 2) + ':D' + (index + 2);
               helper.http.patch('https://graph.microsoft.com/beta/me/drive/items/' + helper.workbookItemId + '/workbook/worksheets(\'Sheet1\')/range(address=\'' + address + '\')', JSON.stringify(rowData), {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                  // Check the response status before trying to resolve 
                  if (res.status === 200)
                     resolve();
                  else
                     reject('Get rows failed');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
        });
    }
    
    //deletes a row in the Excel datasource
    deleteRow(index:number) {
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
                let address = 'Sheet1!A' + (index + 2) + ':D' + (index + 2);
               helper.http.post('https://graph.microsoft.com/beta/me/drive/items/' + helper.workbookItemId + '/workbook/worksheets(\'Sheet1\')/range(address=\'' + address + '\')/delete', JSON.stringify({ 'shift': 'Up' }), {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                  // Check the response status before trying to resolve
                  if (res.status === 204)
                     resolve();
                  else
                     reject('Delete row failed');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
       });
    }
    
    //deletes a file from OneDrive for business
    deleteFile(id:string) {
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
               helper.http.delete('https://graph.microsoft.com/beta/me/drive/items/' + id, {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                  // Check the response status before trying to resolve
                  if (res.status === 204)
                     resolve();
                  else
                     reject('Delete row failed');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
       });
    }
    
    //loads a photo from OneDrive for Business
    loadPhoto(id:string) {
        //loads a photo for display
        let helper = this;
        return new Promise((resolve, reject) => {
            helper.authHelper.getTokenForResource(helper.authHelper._graphResource).then(function(token: Microsoft.ADAL.AuthenticationResult) {
                //first get the thumbnails
                helper.http.get('https://graph.microsoft.com/beta/me/drive/items/' + id + '/thumbnails', {
                   headers: new Headers({ 'Authorization': 'Bearer ' + token.accessToken })
               })
               .subscribe(res => {
                    // Check the response status before trying to resolve
                    if (res.status === 200) {
                        var data = res.json().value;
                        var resource = data[0].medium.url.substring(8);
                        resource = "https://" + resource.substring(0, resource.indexOf('/'));
                        helper.authHelper.getTokenForResource(resource).then(function(thumbtoken: Microsoft.ADAL.AuthenticationResult) {
                            //prepare the content request
                            let req = new XMLHttpRequest();
                            req.open('GET', data[0].medium.url, true);
                            req.responseType = 'blob';
                            req.setRequestHeader('Authorization', 'Bearer ' + thumbtoken.accessToken);
                            req.setRequestHeader('Accept', 'application/json;odata=verbose');
                            req.onload = function(e) {
                                //check response
                                if (this.status === 200) {
                                    //get the blob and convert to base64 using FileReader
                                    var blob = req.response;
                                    var reader = new FileReader();
                                    reader.onload = function(evt){
                                        var base64 = evt.target.result;
                                        base64 = base64.substring(base64.indexOf(',') + 1);
                                        resolve(base64);
                                    };
                                    reader.readAsDataURL(blob);
                                }
                                else
                                    reject('Failed to read image');
                            };
                            req.onerror = function(e) {
                               reject('Failed to download image');
                            };
                            req.send();
                        }, function(err) {
                            reject('Error getting token for thumbnail');
                        });
                    }
                    else
                        reject('Thumbnail load failed');
               });
            }, function(err) {
                reject(err); //error getting token for MS Graph
            });
       });
    }
    
    //utility function get generate a random filename
    getRandomFileName(len: number, ext?: string, prefix?: string) {
        var val:string = '';
        var chars: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        for (var i = 0; i < len; i++) {
            var index = Math.floor(Math.random() * chars.length);
            val += chars[index];
        }
        
        if (ext)
            val = val + ext;
        if (prefix)
            val = prefix + '_' + val;
        
        return val;
    }
}