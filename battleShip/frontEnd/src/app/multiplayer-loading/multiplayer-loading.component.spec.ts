import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiplayerLoadingComponent } from './multiplayer-loading.component';

describe('MultiplayerLoadingComponent', () => {
  let component: MultiplayerLoadingComponent;
  let fixture: ComponentFixture<MultiplayerLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiplayerLoadingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiplayerLoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
