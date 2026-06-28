import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `<router-outlet />`,
  styleUrl: './app.css',
  imports: [RouterOutlet],
})
export class App {}
