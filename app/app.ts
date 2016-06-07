import {ViewChild} from '@angular/core';
import {App, Platform, MenuController, Nav} from 'ionic-angular';
import {StatusBar} from 'ionic-native';
import {AuthHelper} from './providers/auth-helper';
import {LoginPage} from './pages/login/login';
import {ListPage} from './pages/list/list';


@App({
  templateUrl: 'build/app.html',
  providers: [AuthHelper],
  config: {} // http://ionicframework.com/docs/v2/api/config/Config/
})
class MyApp {
  @ViewChild(Nav) nav: Nav;

  //initialize login as default page
  rootPage: any = LoginPage;

  constructor(
    private platform: Platform,
    private menu: MenuController,
    private authHelper: AuthHelper
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      StatusBar.styleDefault();
      
      //check for signed in user
      let n = this.nav;
      this.authHelper.checkAuth().then(function(result) {
        if (result)
          n.setRoot(ListPage);
        else
          n.setRoot(LoginPage);
      });
    });
  }
}
