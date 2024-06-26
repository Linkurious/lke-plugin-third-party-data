/*
 * You can import a whole script if you need it to be executed in your app
 * but you are not using it directly (e.g. to import some libraries from npm)
 */
/*
 * You can also import styles sheets, they will be bundled in a css file
 */
import 'bootstrap/dist/css/bootstrap.css';

import {ServiceFacade} from './serviceFacade';

window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(location.search);
  const services = new ServiceFacade();
  void services.init(urlParams);
});
