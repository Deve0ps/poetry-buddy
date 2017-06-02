import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { RhymeService } from "app/rhyme.service";
import { Observable } from "rxjs/Observable";
import { PoemCoupletFocusService } from "./poem-couplet-focus.service";

import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';

@Component({
  selector: 'poem-couplet',
  templateUrl: './poem-couplet.component.html',
  styleUrls: ['./poem-couplet.component.css']
})
export class PoemCoupletComponent implements OnInit {
  @ViewChild('coupletInput1') private coupletInput1;
  @Input() stanza: object;
  @Input() coupletIndex: number;
  @Input() showText: boolean;

  //Observable sources
  private inputSubject: BehaviorSubject<string> = new BehaviorSubject("");
  
  //Observable streams
  public inputObservable$ = this.inputSubject.asObservable();
  
  private rhymeHints: string[] = [];
  private searchFailed: boolean = false;
  private unchanged: boolean = true;
  private isLoading: boolean = false;

  public focus:boolean = false;
  public currentWord: string = "";
  public searchText: string = null;

  constructor(
    private _service: RhymeService, 
    private poemCoupletFocusService: PoemCoupletFocusService,
    public elementRef: ElementRef //Used as a hook by the poem-couplet-focus service
  ) { }

  ngOnInit() {

    //Subscribe to the focus service to allow enter presses to change focus between components
    this.poemCoupletFocusService.focusedCouplet$.subscribe((index) => {
      if (index === this.coupletIndex) {
        this.setFocusToThisCouplet();
      }
    });

    //Subscribe to the input observable to fetch rhymes as the input text changes.
    this.inputObservable$
      .debounceTime(300)
      .subscribe((words) => {
        this.getRhymesForLastWordInPhrase(words);
      });

  }

  setFocusToThisCouplet() : void {
    if (this.coupletInput1) {
      this.coupletInput1.nativeElement.focus()
    } else {
      //If the user presses enter on the last line of the previous couplet, a new couplet will be created. If this couplet is brand new and hasn't had time to render, set a small delay to give it time to render before setting focus to the input.
      setTimeout(() => { this.coupletInput1.nativeElement.focus() }, 10);
    }
  }

  getRhymesForLastWordInPhrase(phrase: string) : void {
    let lastWord = phrase.split(" ").pop().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    this.currentWord = lastWord;
    this.isLoading = true;

    this._service.search(lastWord)
      .subscribe((response) => {
        this.updateRhymeHints(response);
      }, (error) => {
        this.onRhymeHintsFail(error);
      })
  }

  updateRhymeHints(hints: string[]) : void {
    this.rhymeHints = hints;
    this.searchFailed = false;
    this.isLoading = false;
  }

  onRhymeHintsFail(error) : void {
    this.searchFailed = true;
    this.isLoading = false;
  }

  inputUpdate1($event) : void {
    let words = $event.target.value.trim();
    let newSearch = words.split(" ").pop().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    this.searchText = newSearch;
    this.unchanged = false;

    //If the key pressed is enter, switch focus to the next couplet rather than emitting a new input change. 
    if (this.checkForEnterPress($event)) {
      this.focusNextInput($event)
    } else {
      this.isLoading = true;
      this.inputSubject.next(words);
    }

  }

  focusNextInput($event) : void {
    //If the next input element is the next input element sibling (i.e. going from line one to line two), focus on that element. Otherwise, let the couplet focus service handle switching focus to the next couplet in the poem.
    let nextElement = $event.target.nextElementSibling;
    if (nextElement && 'type' in nextElement && nextElement.type === "text") {
      nextElement.focus();
    } else {
      this.poemCoupletFocusService.coupletFinished(this.coupletIndex);
    }
  }

  onCoupletBlur() : void {
    this.focus = false;
  }

  onFocus($event) : void {
    this.focus = true;
    this.poemCoupletFocusService.coupletFocussed(this);
  }

  onLine2Keyup($event) : void {
    if (this.checkForEnterPress($event)) {
      this.focusNextInput($event)
    }
  }

  checkForEnterPress($event) : boolean {
    return ($event.keyCode === 13)
  }

}
