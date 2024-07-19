'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}


/* ------------------------------ APPLICATION ------------------------------ */
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnShowAllWorkouts = document.querySelector('.sidebar__button--zoom-all');
const btnShowUserPosition = document.querySelector('.sidebar__button--my-position');
const btnSortWorkouts = document.querySelector('.sidebar__button--sort-distance');
const btnDeleteWorkout = document.querySelector('.sidebar__button--delete-workout');
const btnDeleteAllWorkouts = document.querySelector('.sidebar__button--delete-all');
const btnCloseForm = document.querySelector('.form__btn--close');


class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #userCoords;

  #circle = null;
  #route = null;


  #currentWorkout = {
    workout:null,
    workoutIndex: null,
  };
  
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getWorkoutsLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Delete all workouts
    btnDeleteAllWorkouts.addEventListener('click', this._deleteAllWorkouts.bind(this));

    // Show cuurent user position on a map
    btnShowUserPosition.addEventListener('click', this._scrollToUserPostion.bind(this));

    // Sort workouts
    btnSortWorkouts.addEventListener('change', this._setSortedWorkouts.bind(this));

    // Remove current element
    btnDeleteWorkout.addEventListener('click', this._deleteCurrentWorkout.bind(this));

    // Show all workouts on a map 
    btnShowAllWorkouts.addEventListener('click', this._showAllWorkouts.bind(this));
  
    //Close the form 
    btnCloseForm.addEventListener('click', this._onCloseForm.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#userCoords = coords;

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
      this.#map.on('click', this._showForm.bind(this));

      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });

    // Info user 
    const userLocation = L.marker([latitude, longitude]).addTo(this.#map)
    .bindPopup(L.popup({
      maxWidth: 250, 
      minWidth:100,
      autoClose:false,
      closeOnClick:false,
      className:'user-popup'
    }))
    .setPopupContent('You')
    .openPopup();

    userLocation.coords = [latitude, longitude];

    const userCircle = L.circle(userLocation.coords, {
      radius: 200,
      color: '#509825da',
      fillOpacity: 0.2
    });

    userCircle.addTo(this.#map);
  }

  _onCloseForm(e){
    e.preventDefault();

    // Hide Form For The View
    this._hideForm();
  
    // Instead Display Empty Message Preview
    this.#workouts.length === 0 && this._showEmptyPreview();
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();

    // Scroll to form component on a smaller  screens 
    window.innerWidth <= 958 && form.scrollIntoView({behavior:"smooth"});

    // Display Buttons
    this.#workouts.length === 0 && this._showSetOfButtons();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

  
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if(!validInputs(cadence, distance, duration)){
        return alert('Check if cadance, distance, duration are numbers!')
      }else if(!allPositive(distance, duration)){
        return alert('Check if distance, duration are positive!')
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }


    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if(!validInputs(elevation, distance, duration)){
        return alert('Check if elevation gain, distance, duration are numbers!')
      }else if(!allPositive(distance, duration)){
        return alert('Check if distance, duration are positive!')
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setWorkoutsToLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    marker.id = workout.id;

    this.#markers.push(marker);
  }


  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type} ${this.#currentWorkout.workout?.id === workout.id ? "current--workout" : ""}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;
    
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl)return;

    const workoutIndex = this.#workouts?.findIndex(
      work => work.id === workoutEl.dataset.id
    );

    const workout = this.#workouts[workoutIndex];
    if (!workout) return;

    if (workout.id !== this.#currentWorkout.workout?.id) {
      
      // Clear Map in case it has activated route
      this._clearMap("deleteRoute");

      // Deactivate selected workout
      this._deactivateSelectedWorkout();

      // Draw on a map current workout component
      this._animateCurrentWorkout(workoutEl, workout);

      // Define current workout 
      this.#currentWorkout = {
        workout,
        workoutIndex,
      };

      // Scroll To Workout Position
      this._scrollToMarker(workout.coords);

      // Activate Button Delete Workout
      this._activateButtonDelete();
      
    } else {
      // Deactivate selected workout
      this._deactivateSelectedWorkout();

      // Scroll To User Position 
      this._scrollToUserPostion();

      // Simply Deletes a Route on A Map
      this._clearMap("deleteRoute");

      // Set Back #currentWorkout to null
      this._resetCurrentWorkout();
 
     this._deactivateButtonDelete();
    }
  }

  _scrollToMarker(coords){
    this.#map.setView(coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _animateCurrentWorkout(workoutEl, workout){
    workoutEl.classList.add('current--workout');
    
    // create circle
    this.#circle = L.circle(workout.coords, {
      radius: 120,
      color: 'red',
      fillOpacity:0.2
     });


    // create route to workout
    this.#route = L.Routing.control({
      waypoints: [
          L.latLng(this.#userCoords),
          L.latLng(workout.coords)
      ],
      show: false,
      addWaypoints: false,
    });

    // Add shapes to the map 
    this.#circle.addTo(this.#map);
    this.#route.addTo(this.#map);
  }


  _closeEditForm(e){
     if(e.key === 'Escape'){
      form.classList.add('hidden');
     }
  }

  // Clear map 
  _clearMap(type = "") {
    const marker = this.#markers[this.#currentWorkout.workoutIndex];

    // Remove circle and route from map
    (() => {
        if (this.#circle) this.#map.removeLayer(this.#circle);
        if (this.#route) this.#route.remove();
        this.#circle = null;
        this.#route = null;
    })();

    // if we delete the route, we just keep it
    if (type === "deleteRoute")  return;
  

    if (type === "entireMap") {
        this.#markers.forEach(marker => this.#map.removeLayer(marker));
        this.#markers = [];
    } else {
        this.#map.removeLayer(marker);
    }
  }

  // This function responsible for setting up all of the workout markers
  _showAllWorkouts(){
    if(this.#markers.length > 0)
        this.#map.fitBounds(L.featureGroup(this.#markers).getBounds());
  }

   // Go to the cuurent user position
   _scrollToUserPostion(){
    this.#map.setView(this.#userCoords, this.#mapZoomLevel, {animate:true, pan:{duration:1}});
   }

   // Sort workouts
   _setSortedWorkouts(e){
     let option = e.target.value;
     this._sortWorkouts(option);
   }

   _sortWorkouts(option){
    this._deleteAllWorkoutsView();
    
    const sortOpitions = {
      "Sort By Lowest Distance": (a, b) => b.distance  -  a.distance,
      "By Highest Distance": (a, b) => a.distance  -  b.distance,
    }

    let sorted = 
      option === "SortBy Default" ? 
      this.#workouts : 
      this.#workouts.toSorted(sortOpitions[option]);


     sorted.forEach(work => {
      this._renderWorkout(work);
     })
  }

   // Delete current workout
  _deleteCurrentWorkout() {
    if (this.#currentWorkout.workoutIndex === null) return;

    this._scrollToUserPostion();

    // Delete workout from sidebar
    this._deleteSelected(this.#currentWorkout.workout.id);

    // Delete workout marker on map
    this._clearMap("deleteMarker");

    this._resetCurrentWorkout();
  }

  _deleteSelected(id){
    const workoutElement = document.querySelector(`.workout[data-id="${id}"]`);
    containerWorkouts.removeChild(workoutElement);

    this.#workouts.splice(this.#currentWorkout.workoutIndex, 1);
    this._setWorkoutsToLocalStorage();

    // Show Empty Message
    this.#workouts.length === 0 && this._showEmptyPreview();

    // Deactivate button that deletes workout
    this._deactivateButtonDelete();
  }

  // Delete All Workouts
  _deleteAllWorkouts(){
    this._scrollToUserPostion();
    document.querySelectorAll(".workout").forEach(work => containerWorkouts.removeChild(work));
    this._clearMap("entireMap");
    
 
    this.#workouts = [];
    this._setWorkoutsToLocalStorage();


    this._showEmptyPreview();

    this._deactivateButtonDelete();
  }

  _deactivateSelectedWorkout(){
    document.querySelectorAll('.workout').forEach(work => work.classList.remove('current--workout'));
  }

  _deleteAllWorkoutsView(){
    document.querySelectorAll('.workout').forEach(work => containerWorkouts.removeChild(work));
  }

  _activateButtonDelete(){
    document.querySelector(".sidebar__button--delete-workout").classList.remove("disable");
  }

  _deactivateButtonDelete(){
    document.querySelector(".sidebar__button--delete-workout").classList.add("disable");
  }

  // Reset current workout
  _resetCurrentWorkout(){
    this.#currentWorkout = {
      workout: null,
      workoutIndex: null,
    };
  }

  // Storage Workouts 
  _setWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Get from storage workouts, and set them as a current once
  _getWorkoutsLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });


    this.#workouts.length === 0 ? this._showEmptyPreview() : this._showSetOfButtons();
  }

  // Toggle Emptyy Container 
  _showEmptyPreview(){
    document.querySelector(".empty-container").classList.remove("hidden");
    document.querySelector(".sidebar__buttons").classList.add("hidden");
  }

  _showSetOfButtons(){
    document.querySelector(".empty-container").classList.add("hidden");
    document.querySelector(".sidebar__buttons").classList.remove("hidden");
  }
}

const app = new App();