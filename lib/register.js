import bcrypt from "bcrypt";
import { got } from "got";
import { authenticator } from "otplib";
import { v4 } from "uuid";

import config from "$config";
import countries from "$lib/countries";
import { s, g, archive } from "$lib/db";
import { l, warn } from "$lib/logging";
import { fail, getUser } from "$lib/utils";

export default async (user, ip, requireChallenge) => {
  let { profile, password, pubkey, username } = user;
  l("registering", username);

  if (!username) fail("Username required");

  username = username.replace(/ /g, "").toLowerCase();
  let id = v4();
  user.id = id;

  let exists = await getUser(username);
  if (exists) fail(`Username ${username} taken`);

  if (password) {
    user.password = await bcrypt.hash(password, 1);
  }

  user.currency = "USD";
  if (config.ipregistry) {
    try {
      let {
        location: { country: { code } },
      } = await got(
        `https://api.ipregistry.co/${ip}?key=${config.ipregistry}&fields=location.country.code`,
      ).json();

      user.currency = countries[code];
    } catch (e) {
      warn("unable to detect country from IP", username);
    }
  }

  user.currencies = [...new Set([user.currency, "CAD", "USD"])];
  user.fiat = false;
  user.otpsecret = authenticator.generateSecret();
  user.migrated = true;
  user.locktime = 300;

  await s(`user:${id}`, user);
  await s(`user:${username}`, id);
  await s(`user:${pubkey}`, id);
  await s(`balance:${id}`, 0);

  l("new user", username);
  return user;
};
