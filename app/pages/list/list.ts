import {NgZone} from '@angular/core';
import {Page, NavController, NavParams, Loading, Modal, Alert} from 'ionic-angular';
import {CurrencyPipe} from '@angular/common';
import {ItemDetailsPage} from '../item-details/item-details';
import {DriveHelper} from '../../providers/drive-helper';
import {Expense} from '../../providers/expense';


@Page({
  templateUrl: 'build/pages/list/list.html',
  providers: [DriveHelper, Expense],
  pipes: [CurrencyPipe]
})
export class ListPage {
  selectedItem: any;
  icons: string[];
  items: Array<Expense>;
  loading: Loading;
  helper: DriveHelper;
  zone: NgZone;

  constructor(
    private nav: NavController, 
    navParams: NavParams,
    driveHelper: DriveHelper,
    zone: NgZone) {
    // If we navigated to this page, we will have an item available as a nav param
    this.selectedItem = navParams.get('item');
    this.items = [];
    this.helper = driveHelper;
    this.zone = zone;
    
    //show loading indicator
    this.showWaiting('Loading...');
    
    //ensure the configuration is in place before getting data
    let ctrl = this;
    ctrl.helper.ensureConfig().then(function(result: boolean) {
      //check for success
      if (result) {
        ctrl.listRefresh(null);
      }
      else
        ctrl.error('Failed to ensure configuration');
    }, function(err) {
      ctrl.error(err);
    });
  }
  
  //refreshes the list
  listRefresh(refresher) {
    let ctrl = this;
    Expense.getItems(this.helper).then(function(data: Array<Expense>) {
      ctrl.items = data;
      if (ctrl.loading.isLoaded())
        ctrl.loading.dismiss();  
      if (refresher)
        refresher.complete();
    }, function(err) {
      ctrl.error(err);
    });
  }
  
  //show the waiting indicator with message
  showWaiting(msg:string) {
    //initialize loading indicator
    this.loading = Loading.create({
      content: msg,
      dismissOnPageChange: false
    });
    this.nav.present(this.loading);
  }
  
  //launches the new dialog
  new() {
    let ctrl = this;
    
    ctrl.zone.run(() => {
      //launch the detail page in a modal window
      let modal = Modal.create(ItemDetailsPage, { item: null });
      modal.onDismiss(newItem => {
        //check if a new item was passed back
        if (newItem)
          ctrl.items.push(newItem);
      });
      this.nav.present(modal);
    });
  }
  
  //launches the edit dialog
  edit(evt, index:number, item:Expense, slidingItem) {
    let ctrl = this;
    slidingItem.close();
    
    ctrl.zone.run(() => {
      //launch the detail page in a modal window
      let modal = Modal.create(ItemDetailsPage, { item: item, index: index });
      modal.onDismiss(updateItem => {
        //check if a new item was passed back
        if (updateItem)
          item = updateItem;
      });
      this.nav.present(modal);
    });
  }
  
  //deletes the specified row
  delete(evt, index:number, item:Expense) {
    let ctrl = this;
    this.showWaiting('Deleting expense...');
    
    //delete the expense
    ctrl.zone.run(() => {
      item.delete(ctrl.helper, index).then(function() {
        //remove the item from the items array
        ctrl.items.splice(index, 1);
        ctrl.loading.dismiss();
      }, function(err) {
        ctrl.error(err);
        ctrl.loading.dismiss();
      });
    });
  }
  
  //displays error message
  error(msg) {
    let alert = Alert.create({
      title: 'Error Occurred',
      subTitle: msg,
      buttons: ['OK']
    });
    this.nav.present(alert);
  }
}
