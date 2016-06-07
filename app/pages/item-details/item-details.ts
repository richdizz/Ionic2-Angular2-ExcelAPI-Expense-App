import {NgZone} from '@angular/core';
import {Page, NavController, NavParams, ActionSheet, Loading, ViewController, Alert } from 'ionic-angular';
import {Expense} from '../../providers/expense';
import {DriveHelper} from '../../providers/drive-helper';

@Page({
  templateUrl: 'build/pages/item-details/item-details.html',
  providers: [Expense, DriveHelper]
})
export class ItemDetailsPage {
  selectedItem: Expense;
  zone: NgZone;
  isPortrait: boolean;
  isNew: boolean = false;
  loading: Loading;
  helper: DriveHelper;
  viewCtrl: ViewController;
  index: number;

  constructor(private nav: NavController, 
    viewCtrl: ViewController, 
    navParams: NavParams, 
    zone: NgZone,
    driveHelper: DriveHelper) {
      
    // If we navigated to this page, we will have an item available as a nav param
    this.selectedItem = navParams.get('item');
    this.index = navParams.get('index');
    this.zone = zone;
    this.isPortrait = true;
    this.helper = driveHelper;
    this.viewCtrl = viewCtrl;
    
    //determine if this is an create or update
    if (this.selectedItem == null) {
      this.isNew = true;
      this.selectedItem = new Expense();
    }
    else {
      this.selectedItem.receiptUpdated = false;
      if (!this.selectedItem.receiptData && this.selectedItem.receiptId) {
        let ctrl = this;
        ctrl.showWaiting('Loading...');
        ctrl.helper.loadPhoto(ctrl.selectedItem.receiptId).then(function(img:string) {
          //initialize the image into an Image object to determine ratio
          let i = new Image(); 
          i.onload = () => {
            ctrl.isPortrait = (i.width < i.height);
            ctrl.selectedItem.receiptData = img;
            ctrl.loading.dismiss();
          };
          i.src = 'data:image/jpg;base64, ' + img;
        }, function(err) {
          ctrl.loading.dismiss();
          ctrl.error(err);
        })
      }
    }
  }
  
  //captures receipt from camera or photo library
  captureReceipt() {
    let ctrl = this;
    let actionSheet = ActionSheet.create({
      title: 'Select Receipt Source',
      buttons: [
        {
          text: 'Camera',
          handler: () => {
            //use the camera to capture receipt
            ctrl.showWaiting('Loading...');
            navigator.camera.getPicture(function(imgData) {
              ctrl.imgLoaded(imgData, ctrl);
            }, function(err) {
              //ignore...could be from cancel
              ctrl.loading.dismiss();
            }, { quality: 50,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.CAMERA});
          }
        },{
          text: 'Photo Library',
          handler: () => {
            //use the photo library to capture receipt
            ctrl.showWaiting('Loading...');
            navigator.camera.getPicture(function(imgData) {
              ctrl.imgLoaded(imgData, ctrl);
            }, function(err) {
              //ignore...could be from cancel
              ctrl.loading.dismiss();
            }, { quality: 50,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY
           });
          }
        }
      ]
    });
    this.nav.present(actionSheet);
  }
  
  //shows waiting indicator with message
  showWaiting(msg:string) {
    //initialize loading indicator
    this.loading = Loading.create({
      content: msg,
      dismissOnPageChange: false
    });
    this.nav.present(this.loading);
  }
  
  //callback when image is loaded
  imgLoaded(imgData: string, ctrl: ItemDetailsPage) {
    //determine img ratio
    let i = new Image(); 
    i.onload = () => {
      ctrl.isPortrait = (i.width < i.height);
      ctrl.selectedItem.receiptData = imgData;
      ctrl.selectedItem.receiptUpdated = true;
      ctrl.loading.dismiss();
    };
    i.src = 'data:image/jpg;base64, ' + imgData;
  }
  
  //dismisses the view
  dismiss() {
    //dismiss the modal
    this.viewCtrl.dismiss();
  }
  
  //saves the expense item
  save() {
    let ctrl = this;
    this.showWaiting('Saving...');
    
    //save the item
    if (ctrl.isNew) {
      this.selectedItem.create(this.helper).then(function(result) {
        //dismiss the waiting indicator and this pass the item back to parent
        ctrl.loading.dismiss();
        ctrl.viewCtrl.dismiss(ctrl.selectedItem);
      }, function(err) {
        ctrl.loading.dismiss();
        ctrl.error(err);
      });
    }
    else {
      this.selectedItem.update(this.index, this.helper).then(function(result) {
        //dismiss the waiting indicator and this pass the item back to parent
        ctrl.loading.dismiss();
        ctrl.viewCtrl.dismiss(ctrl.selectedItem);
      }, function(err) {
        ctrl.loading.dismiss();
        ctrl.error(err);
      });
    }
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
