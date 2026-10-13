# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who trains at a gym and wants to log what they lift. The product is meant for the
public, not only for its author.

They use it on a phone, standing between sets, usually with one hand and little attention to
spare. Each visit to a screen is short: log the set just done, glance at what comes next.

## Product Purpose

Gym Weight Tracker records workouts: the exercises of a session and, for each set, the weight
and reps (or the minutes, for timed exercises such as planks and cardio).

Success is a set logged in a few seconds without breaking the rhythm of the workout, and a
user who can tell at a glance whether they are doing better than last time.

## Positioning

Two things come first, ahead of any other feature:

1. **Fast logging between sets.** As few taps as possible to record weight and reps and move on.
2. **Last time is always in view.** What the user did the previous time they performed an
   exercise sits next to the fields where they log today's set.

## Operating Context

- Used at the gym, on an iPhone, mid-workout. The author's own test device is an iPhone with a
  Romanian keyboard, whose numeric keypad has a comma and no period or dash.
- A workout runs against a timer. It can be stopped and started again, then finished for good.
- Workouts can start empty or from a saved template.
- Outside the gym the user reviews: history by month, personal records, profile totals.

## Capabilities and Constraints

- **Stack:** Vue 3, Vuetify 4, Vite, vue-router. A separate Laravel API (`gym-weight-tracker-backend`) holds the data.
- **Accounts:** register and log in; every user sees only their own workouts.
- **Exercise catalog:** shared exercises grouped by muscle group (Chest, Back, Shoulders, Traps,
  Biceps, Triceps, Forearms, Abs, Legs, Cardio), plus exercises a user creates for themselves.
- **Sets:** weight in kg with a comma or a period as decimal separator; reps as a number or a
  range such as `9-10` when the last rep was a struggle (the lower number counts for records and
  volume); minutes for timed exercises.
- **Compound exercises** are marked and can show the other muscle groups they work.
- **Suggestions:** an empty field repeats the matching set from last time, so repeating a set is one tap.
- **Personal records** per exercise, with a celebration moment when one is beaten mid-workout.
- **Dashboard:** workouts in the last 30 days, last workout, average duration (workouts under
  5 minutes are left out of the average), recent workouts, the workout in progress.
- **Templates, history with monthly stats, profile with a chosen avatar.**
- **Terminology in the UI:** workout, exercise, set, reps, template, personal record, "Last time".
- **Units:** kilograms and minutes only. Pounds are not supported.
- **Undecided:** whether the app will be installable (PWA) or stay a website; any monetisation.

## Brand Commitments

- The name is **Gym Weight Tracker**.
- The interface is in **English**.
- **Phone first:** every screen is designed for a phone held in one hand; desktop is secondary.

## Evidence on Hand

- The running product itself and its screens in `src/components/`.
- No testimonials, user counts, press or benchmarks exist. Future work must not invent any.

## Product Principles

1. **The set comes first.** Logging the set just done is the most important action on any
   workout screen; nothing may slow it down or sit in its way.
2. **Show last time.** Where the user decides what to lift, the previous numbers are already there.
3. **Built for a tired thumb.** Large targets, the keypad the phone actually offers, forgiving input.
4. **Nothing extra during a workout.** Secondary information stays one tap away, not on screen by default.
5. **Honest numbers.** Records, averages and volume follow rules the user can predict.
