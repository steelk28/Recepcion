import { Service } from '@angular/core';
export const API_URL =  `http://${window.location.hostname}:8000/api`;

@Service()
export class Config {

}
