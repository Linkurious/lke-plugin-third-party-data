/*
 * You can import a whole script if you need it to be executed in your app
 * but you are not using it directly (e.g. to import some libraries from npm)
 */
import 'bootstrap';
/*
 * You can also import styles sheets, they will be bundled in a css file
 */
import 'bootstrap/dist/css/bootstrap.min.css';

import {ServiceFacade} from './serviceFacade.ts';

window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(location.search);
  const services = new ServiceFacade();
  void services.init(urlParams);
});
