import {Page, NavController,Alert} from 'ionic-angular';
import {AuthHelper} from '../../providers/auth-helper';
import {ListPage} from '../list/list';

@Page({
  templateUrl: 'build/pages/login/login.html'
})
export class LoginPage {
  constructor(private nav: NavController, private authHelper: AuthHelper) {}
  
  login() {
    let ctrl = this;
    this.authHelper.signin().then(function(token) {
      ctrl.nav.setRoot(ListPage);
    }, function(err) {
      ctrl.error(err);
    });
  }
  
  error(msg) {
    let alert = Alert.create({
      title: 'Error Occurred',
      subTitle: msg,
      buttons: ['OK']
    });
    this.nav.present(alert);
  }
}
