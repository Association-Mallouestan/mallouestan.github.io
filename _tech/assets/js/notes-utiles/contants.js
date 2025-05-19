export function uuidv4() {
  return "00000000-0000-0000-8000-000000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

export const pin_icons = ["magnet-outline", "magnet"];

/** Global Variables */
export const priorities_icons = [
  "sunny-outline",
  "cloudy-outline",
  "rainy-outline",
  "thunderstorm-outline",
  "skull-outline",
];

export const mainChannel = new BroadcastChannel("notes_channel");

