import {Injectable} from '@angular/core';
import {DriveHelper} from '../providers/drive-helper';

@Injectable()
export class Expense {
    constructor() {
    }
    
    vendor: string;
    amount: number;
    category: string;
    receiptId: string;
    receiptData: string;
    receiptUpdated: boolean = false;
    
    //creates a new expense entry
    create(helper: DriveHelper) {
        let obj = this;
        return new Promise((resolve, reject) => {
            //first check if receipt exists
            if (obj.receiptUpdated) {
                //generate random filename
                var filename = helper.getRandomFileName(8, '.jpg', obj.category.replace(' ', '').replace('/', ''));
            
                //first try to save the receipt if exists
                helper.uploadFile(obj.receiptData, filename).then(function(id: string) {
                    obj.receiptId = id;
                    
                    //now update the row
                    var rowData = obj.parse();
                    helper.addRow(rowData).then(function() {
                        resolve(obj);
                    }, function(err) {
                        reject(err); 
                    });
                }, function(err) {
                    reject(err);
                });
            }
            else {
                //add row without picture
                var rowData = obj.parse();
                helper.addRow(rowData).then(function() {
                    resolve(obj);
                }, function(err) {
                   reject(err); 
                });
            }
        });
    }
    
    //updates an existing expense entry
    update(index: number, helper:DriveHelper) {
        let obj = this;
        return new Promise((resolve, reject) => {
            //first check if receipt updates
            if (obj.receiptUpdated) {
                //generate random filename
                var filename = helper.getRandomFileName(8, '.jpg', obj.category.replace(' ', '').replace('/', ''));
            
                //first try to save the receipt if exists
                helper.uploadFile(obj.receiptData, filename).then(function(id: string) {
                    obj.receiptId = id;
                    
                    //now update the row
                    var rowData = obj.parse();
                    helper.updateRow(index, rowData).then(function() {
                        resolve(obj);
                    }, function(err) {
                        reject(err); 
                    });
                }, function(err) {
                    reject(err);
                });
            }
            else {
                //use same picture, just update the metadata
                var rowData = obj.parse();
                helper.updateRow(index, rowData).then(function() {
                    resolve(obj);
                }, function(err) {
                   reject(err); 
                });
            }
        });
    }
    
    //deletes and expense entry
    delete(helper: DriveHelper, index:number) {
        let obj = this;
        return new Promise((resolve, reject) => {
            helper.deleteRow(index).then(function() {
                helper.deleteFile(obj.receiptId).then(function() {
                    resolve();
                }, function(err) {
                    reject(err);
                })
            }, function(err) {
                reject(err);
            })
        });
    }
    
    //parses the object into a mutli-dimensional array for Excel
    parse() {
        return { values: [[ this.vendor, this.amount, this.category, this.receiptId ]] };
    }
    
    //parses the raw data from excel into an array of Expense objects
    static parseArray(items:Array<any>) : Array<Expense> {
        var result: Array<Expense> = new Array<Expense>();
        for (var i = 0; i < items.length; i++) {
            var e = new Expense();
            e.vendor = items[i].values[0][0];
            e.amount = items[i].values[0][1];
            e.category = items[i].values[0][2];
            e.receiptId = items[i].values[0][3];
            result.push(e);
        }
        return result;
    }
    
    //gets all expense items
    static getItems(helper:DriveHelper) {
        return new Promise((resolve, reject) => {
            helper.getRows().then(function(data: Array<any>) {
                resolve(Expense.parseArray(data));
            }, function(err) {
                reject(err);
            });
        });
    }
}