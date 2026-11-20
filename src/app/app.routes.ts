import { Routes } from '@angular/router';
import { Home } from './home/home';
import { NewNumber } from './new-number/new-number';
import { Ajustes } from './ajustes/ajustes';
import { Dependencias } from './dependencias/dependencias';
import { Anios } from './anios/anios';
import { Informe } from './informe/informe';


export const routes: Routes = [

    {path: '', redirectTo: 'home', pathMatch: 'full'},

    {path: 'home', component: Home},

    {path: 'new-number', component: NewNumber},

    { path: 'ajustes', component: Ajustes },
      
    { path: 'dependencias', component: Dependencias },

    { path: 'anios', component: Anios },

    { path: 'informe', component: Informe },

];
