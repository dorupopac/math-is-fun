import { shuffle } from './helpers.js';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

///////////////////////////////////////
// APPLICATION ARCHITECTURE
// Pages
const gamePage = document.getElementById('game-page');
const scorePage = document.getElementById('score-page');
const splashPage = document.getElementById('splash-page');
const countdownPage = document.getElementById('countdown-page');
// Splash Page
const startForm = document.getElementById('start-form');
const radioContainers = document.querySelectorAll('.radio-container');
const bestScores = document.querySelectorAll('.best-score-value');
const selectionContainer = document.querySelector('.selection-container');
const selectAmountErr = document.getElementById('select-amount-message');
// Countdown Page
const countdown = document.querySelector('.countdown');
// Game Page
const itemContainer = document.querySelector('.item-container');
let equationItems;
const wrongBtn = document.querySelector('.wrong');
const rightBtn = document.querySelector('.right');
// Score Page
const finalTimeEl = document.querySelector('.final-time');
const baseTimeEl = document.querySelector('.base-time');
const penaltyTimeEl = document.querySelector('.penalty-time');
const playAgainBtn = document.querySelector('.play-again');

class App {
  // Equations
  #questionAmount = 0;
  #equationsArray = [];
  #playerGuessArray = [];
  #bestScoreArray = [];

  // Game Page
  #firstNumber = 0;
  #secondNumber = 0;
  #equationObject = {};
  #wrongFormat = [];
  #currEquation = -1;

  // Time
  #timer;
  #timePlayed = 0;
  #baseTime = 0;
  #penaltyTime = 0;
  #finalTime = 0;
  #finalTimeDisplay = '0.0';
  #startTimerFunction = this._startTimer.bind(this);

  // Scroll
  #valueY = 0;

  constructor() {
    this._getSavedBestScores();
    // prettier-ignore
    selectionContainer.addEventListener('click', this._highlightSelected.bind(this));
    startForm.addEventListener('submit', this._selectQuestionAmount.bind(this));
    wrongBtn.addEventListener('click', () => this._select(false));
    rightBtn.addEventListener('click', () => this._select(true));
    gamePage.addEventListener('click', this.#startTimerFunction);
    playAgainBtn.addEventListener('click', this._playAgain.bind(this));
  }

  // Refresh Splash Page Best Scores
  _bestScoresToDOM() {
    bestScores.forEach(
      (bestScore, i) =>
        (bestScore.textContent = `${this.#bestScoreArray[i].bestScore}s`)
    );
  }

  // Check Local Storage for Best Scores, set bestScoreArray
  _getSavedBestScores() {
    if (localStorage.getItem('bestScores')) {
      this.#bestScoreArray = JSON.parse(localStorage.bestScores);
    } else {
      this.#bestScoreArray = [
        { questions: 10, bestScore: this.#finalTimeDisplay },
        { questions: 25, bestScore: this.#finalTimeDisplay },
        { questions: 50, bestScore: this.#finalTimeDisplay },
        { questions: 99, bestScore: this.#finalTimeDisplay },
      ];
      localStorage.setItem('bestScores', JSON.stringify(this.#bestScoreArray));
    }
    this._bestScoresToDOM();
  }

  // Update Best Score Array
  _updateBestScore() {
    this.#bestScoreArray.forEach((score, i) => {
      // Select correct Best Score to update
      if (this.#questionAmount === score.questions) {
        // Return Best Score as number with one decimal
        const savedBestScore = +this.#bestScoreArray[i].bestScore;
        // Update if the new final score is less or replacing zero
        if (savedBestScore === 0 || savedBestScore > this.#finalTime) {
          this.#bestScoreArray[i].bestScore = this.#finalTimeDisplay;
        }
      }
    });
    // Update Splash Page
    this._bestScoresToDOM();
    // Save to Local Storage
    localStorage.setItem('bestScores', JSON.stringify(this.#bestScoreArray));
  }

  // Displays 3, 2, 1, GO!
  _countdownStart() {
    let count = 3;
    countdown.textContent = count;
    const interval = setInterval(() => {
      countdown.textContent = --count;
      if (count === 0) {
        countdown.textContent = 'GO!';
      }
      if (count === -1) {
        this._showGamePage();
        clearInterval(interval);
      }
    }, 1000);
  }

  // Navigate from Splash Page to Countdown Page to Game Page;
  _showCountdown() {
    countdownPage.hidden = false;
    splashPage.hidden = true;
    this._populateGamePage();
    this._countdownStart();
  }

  // Form that decides amount of questions
  _selectQuestionAmount(e) {
    e.preventDefault();
    if (!this.#questionAmount) {
      selectAmountErr.hidden = false;
      return;
    }
    this._showCountdown();
  }

  // Highlight selected game
  _highlightSelected(e) {
    // stop executing if click isn't on amount container
    if (!e.target.closest('input')) return;
    // Hidde select amount error
    selectAmountErr.hidden = true;

    radioContainers.forEach(radioEl => {
      // Remove Selected Label Styling
      radioEl.classList.remove('selected-label');
      // Add it back if radio button is checked
      if (radioEl.children[1].checked) {
        radioEl.classList.add('selected-label');
      }
    });
    // Get the value from selected radio button
    this.#questionAmount = +e.target.closest('input').value;
  }

  // Reset Game
  _playAgain() {
    gamePage.addEventListener('click', this.#startTimerFunction);
    scorePage.hidden = true;
    splashPage.hidden = false;
    this.#equationsArray = [];
    this.#playerGuessArray = [];
    this.#valueY = 0;
    this.#questionAmount = 0;
    this.#currEquation = -1;
    playAgainBtn.hidden = true;
    rightBtn.disabled = false;
    wrongBtn.disabled = false;
    // Remove previously selected when clicking to play again
    document
      .querySelector('.selected-label')
      .classList.remove('selected-label');
  }

  // Show Score Page
  _showScorePage() {
    gamePage.hidden = true;
    scorePage.hidden = false;
    // Show Play Again button after 1 sec
    setTimeout(() => (playAgainBtn.hidden = false), 1000);
  }

  // Format & Display Time in DOM
  _scoresToDOM() {
    this.#finalTimeDisplay = this.#finalTime.toFixed(1);
    this.#baseTime = this.#timePlayed.toFixed(1);
    this.#penaltyTime = this.#penaltyTime.toFixed(1);
    finalTimeEl.textContent = `${this.#finalTimeDisplay}s`;
    baseTimeEl.textContent = `Base Time: ${this.#baseTime}s`;
    penaltyTimeEl.textContent = `Penalty: ${this.#penaltyTime}s`;
    this._updateBestScore();
    // Scroll to Top, go to Score Page
    itemContainer.scrollTo({ top: 0, behavior: 'instant' });
    this._showScorePage();
  }

  // Stop Timer, Process Results, go to Score Page
  _checkTime() {
    if (this.#playerGuessArray.length === this.#questionAmount) {
      rightBtn.disabled = true;
      wrongBtn.disabled = true;
      clearInterval(this.#timer);
      // Check for wrong guesses, add penalty time
      this.#equationsArray.forEach((equation, i) => {
        if (equation.evaluated !== this.#playerGuessArray[i]) {
          // Incorrect Guess, Add Penalty
          this.#penaltyTime += 0.5;
        }
      });
      this.#finalTime = this.#timePlayed + this.#penaltyTime;
      setTimeout(() => this._scoresToDOM(), 600);
    }
  }

  // Add a tenth of a second to timePlayed
  _addTime() {
    this.#timePlayed += 0.1;
    this._checkTime();
  }

  // Start timer when game page is clicked
  _startTimer() {
    // Reset times
    this.#timePlayed = 0;
    this.#penaltyTime = 0;
    this.#finalTime = 0;
    this.#timer = setInterval(this._addTime.bind(this), 100);
    gamePage.removeEventListener('click', this.#startTimerFunction);
  }

  // Scroll, Store user selection in playerGuessArray
  _select(guessedTrue) {
    this.#currEquation++;

    // Scroll 80 pixels
    this.#valueY += 80;
    itemContainer.scroll(0, this.#valueY);

    // Add player guess to array
    guessedTrue
      ? this.#playerGuessArray.push('true')
      : this.#playerGuessArray.push('false');

    // Set background of equation to red if it was wrong and green if it was correct.
    const equationNumbers = this.#equationsArray[this.#currEquation].value
      .split(/[\sx=]+/)
      .map(number => +number);
    if (equationNumbers[0] * equationNumbers[1] === equationNumbers[2]) {
      equationItems[this.#currEquation].style.background = 'rgb(0,128,0,0.7)';
    } else {
      equationItems[this.#currEquation].style.background = 'rgba(255,0,0,0.7)';
    }
  }

  // Displays Game Page
  _showGamePage() {
    gamePage.hidden = false;
    countdownPage.hidden = true;
  }

  // Get Random Number up to a max number
  _getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  // Create Correct/Incorrect Random Equations
  _createEquations() {
    // Randomly choose how many correct equations there should be
    const correctEquations = this._getRandomInt(this.#questionAmount);
    // Set amount of wrong equations
    const wrongEquations = this.#questionAmount - correctEquations;
    // Loop through, multiply random numbers up to 9, push to array
    for (let i = 0; i < correctEquations; i++) {
      const firstNumber = this._getRandomInt(9);
      const secondNumber = this._getRandomInt(9);
      const equationValue = firstNumber * secondNumber;
      const equation = `${firstNumber} x ${secondNumber} = ${equationValue}`;
      const equationObject = { value: equation, evaluated: 'true' };
      this.#equationsArray.push(equationObject);
    }
    // Loop through, mess with the equation results, push to array
    for (let i = 0; i < wrongEquations; i++) {
      const firstNumber = this._getRandomInt(9);
      const secondNumber = this._getRandomInt(9);
      const equationValue = firstNumber * secondNumber;
      this.#wrongFormat[0] = `${firstNumber} x ${
        secondNumber + 1
      } = ${equationValue}`;
      this.#wrongFormat[1] = `${firstNumber} x ${secondNumber} = ${
        equationValue - 1
      }`;
      this.#wrongFormat[2] = `${
        firstNumber + 1
      } x ${secondNumber} = ${equationValue}`;
      const formatChoice = this._getRandomInt(3);
      const equation = this.#wrongFormat[formatChoice];
      const equationObject = { value: equation, evaluated: 'false' };
      this.#equationsArray.push(equationObject);
    }
    shuffle(this.#equationsArray);
  }

  // Add Equations to DOM
  _equationsToDOM() {
    this.#equationsArray.forEach(equation => {
      // Item
      const item = document.createElement('div');
      item.classList.add('item');
      // Equations Text
      const equationText = document.createElement('h1');
      equationText.textContent = equation.value;
      // Append
      item.appendChild(equationText);
      itemContainer.appendChild(item);
    });
    equationItems = document.querySelectorAll('.item');
  }

  // Dynamically adding correct/incorrect equations
  _populateGamePage() {
    // Reset DOM, Set Blank Space Above
    itemContainer.textContent = '';
    // Spacer
    const topSpacer = document.createElement('div');
    topSpacer.classList.add('height-240');
    // Selected Item
    const selectedItem = document.createElement('div');
    selectedItem.classList.add('selected-item');
    // Append
    itemContainer.append(topSpacer, selectedItem);

    // Create Equations, Build Elements in DOM
    this._createEquations();
    this._equationsToDOM();

    // Set Blank Space Below
    const bottomSpacer = document.createElement('div');
    bottomSpacer.classList.add('height-500');
    itemContainer.appendChild(bottomSpacer);
  }
}
const app = new App();
