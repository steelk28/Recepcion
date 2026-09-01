import { Routes } from '@angular/router';
import { Home } from './home/home';
import { NewNumber } from './new-number/new-number';

export const routes: Routes = [

    {path: '', redirectTo: 'home', pathMatch: 'full'},

    {path: 'home', component: Home},

    {path: 'new-number', component: NewNumber}


];
