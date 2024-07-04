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
  #circles = [];
  #routes = [];
  #markers = [];
  #userCoords;


  #currentWorkout = {
    workout:null,
    workoutIndex: null,
    mapEventsIndex:null,
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
    btnCloseForm.addEventListener('click', this._hideFormManually.bind(this));
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

  _hideFormManually(e){
    e.preventDefault();
    this._hideForm();

    // Toggle the empty message guy
    this.#workouts.length === 0 && this._toggleEmptyContainer();
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();


    // For the smaller screens scroller
    window.innerWidth <= 958 && form.scrollIntoView({behavior:"smooth"})

    // Toggle the empty message guy
    this.#workouts.length === 0 && this._toggleEmptyContainer();
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

    const workoutIndex = this.#workouts.findIndex(
      work => work.id === workoutEl.dataset.id
    );

    const workout = this.#workouts[workoutIndex];
    if (!workout) return;

    if (workout.id !== this.#currentWorkout.workout?.id) {

      this._animateCurrentWorkout(workoutEl, workout);

      const mapEventsIndex = this.#circles.findIndex(
        entity => entity.id === workout.id
      );

      this.#currentWorkout = {
        workout,
        workoutIndex,
        mapEventsIndex,
      };

      this._scrollToMarker(workout.coords);

      this._toggleDeleteActive();

    } else {

      this._deleteCurrentWorkoutAnimation();

      this._scrollToMarker(this.#userCoords);

      this._clearMap("hideRoute");

      this._resetCurrentWorkout();

      this._toggleDeleteActive();
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
    this._deleteCurrentWorkoutAnimation();
    workoutEl.classList.add('current--workout');
    
    this._animateCircle(workout);
    this._animateLineRoute(workout);
  }

  _arrNotIncludesId(arr, id){
    return arr.every(el => el.id !== id);
  }

  _animateCircle(workout){
    const circle = L.circle(workout.coords, {
      radius: 120,
      color: 'red',
      fillOpacity:0.2
     });

     circle.id = workout.id;

    if(this._arrNotIncludesId(this.#circles, workout.id)){
      this.#circles.push(circle);
    }

    this.#circles.forEach(circle => {
      circle.id === workout.id ? circle.addTo(this.#map) : this.#map.removeLayer(circle)
    });
  }


   _animateLineRoute(workout){
    const route = L.Routing.control({
        waypoints: [
            L.latLng(this.#userCoords),
            L.latLng(workout.coords)
        ],
        show: false,
        addWaypoints: false,
      });

      route.id = workout.id;

      if(this._arrNotIncludesId(this.#routes, route.id)){
        this.#routes.push(route);
      }

      this.#routes.forEach(route => {
        route.id === workout.id ? route.addTo(this.#map) : route.remove()
      });
   }

  _closeEditForm(e){
     if(e.key === 'Escape'){
      form.classList.add('hidden');
     }
  }

  // Clear map according to conditions
  _clearMap(type = ""){
    if(type === "deleteRoute") {
      this.#map.removeLayer(this.#markers[this.#currentWorkout.workoutIndex])
      this._clearAnimationsFromTheMap();
      
      this.#markers.splice(this.#currentWorkout.workoutIndex, 1);
      this.#circles.splice(this.#currentWorkout.mapEventsIndex, 1);
      this.#routes.splice(this.#currentWorkout.mapEventsIndex, 1);
    }

    if(type === "hideRoute"){
      this._clearAnimationsFromTheMap();
    }

    if(type === "entireMap"){
      this.#markers.map(marker => this.#map.removeLayer(marker));
      
      if (this.#currentWorkout.mapEventsIndex !== null) { 
        this._clearAnimationsFromTheMap();
      }

      this.#circles = [];
      this.#markers = [];
      this.#routes = [];
    }
  }

  _clearAnimationsFromTheMap(){
    this.#map.removeLayer(this.#circles[this.#currentWorkout.mapEventsIndex]);
    this.#routes[this.#currentWorkout.mapEventsIndex].remove();
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

    this._scrollToMarker(this.#userCoords);

    this._deleteCurrentWorkoutView(this.#currentWorkout.workout.id);

    this._clearMap("deleteRoute");

    this._resetCurrentWorkout();
  }

  _deleteCurrentWorkoutView(id){
    const workoutElement = document.querySelector(`.workout[data-id="${id}"]`);
    containerWorkouts.removeChild(workoutElement);

    this.#workouts.splice(this.#currentWorkout.workoutIndex, 1);
    this._setWorkoutsToLocalStorage();


    // Toggle the human workout
    this.#workouts.length === 0 && this._toggleEmptyContainer();

    this._toggleDeleteActive();
  }

  // Delete All Workouts
  _deleteAllWorkouts(){
    this._scrollToUserPostion();
    document.querySelectorAll(".workout").forEach(work => containerWorkouts.removeChild(work));
    this._clearMap("entireMap");
    
    this.#workouts = [];
    this._setWorkoutsToLocalStorage();

    this._toggleEmptyContainer();

    //When delete all of the workuts, if workout selected and
    this.#currentWorkout.workout !== null && this._toggleDeleteActive();
  }

  // Delete Current Workout Animation
  _deleteCurrentWorkoutAnimation(){
    document.querySelectorAll('.workout').forEach(work => work.classList.remove('current--workout'));
  }

  // Delete All workouts from the view
  _deleteAllWorkoutsView(){
    document.querySelectorAll('.workout').forEach(work => containerWorkouts.removeChild(work));
  }

  // Reset current workout
  _resetCurrentWorkout(){
    this.#currentWorkout = {
      workout: null,
      workoutIndex: null,
      mapEventsIndex:null,
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


    // Toggle the empty message guy
    this.#workouts.length === 0 && this._toggleEmptyContainer();
  }


  // Toggle Emptyy Container 
  _toggleEmptyContainer(){
    document.querySelector(".empty-container").classList.toggle("hidden");
    document.querySelector(".sidebar__buttons").classList.toggle("hidden");
  }

  // Toggle delete button
  _toggleDeleteActive(){
    document.querySelector(".sidebar__button--delete-workout").classList.toggle("active");
  }
}

const app = new App();