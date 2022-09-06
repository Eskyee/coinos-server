import app from "$app";
import db from "$db";
import store from "$lib/store";
import { optionalAuth } from "$lib/passport";
import { Op } from "@sequelize/core";
import axios from "axios";
import { err, l } from "$lib/logging";

app.get("/invoice", async (req, res, next) => {
  try {
    const invoice = await db.Invoice.findOne({
      where: {
        uuid: req.query.uuid
      },
      include: {
        model: db.User,
        as: "user",
        attributes: ["username", "currency"]
      }
    });

    res.send(invoice);
  } catch (e) {
    err("couldn't find invoice", e);
  }
});

app.post("/invoice", optionalAuth, async (req, res, next) => {
  try {
    let { liquidAddress, id, invoice, user, tx } = req.body;
    let { blindkey } = invoice;

    if (invoice.amount < 0) throw new Error("amount out of range");
    if (
      invoice.tip > invoice.amount ||
      invoice.tip > 1000000 ||
      invoice.tip < 0
    )
      throw new Error("tip amount out of range");

    if (liquidAddress) {
      l("conversion request for", liquidAddress, invoice.text);
      convert[invoice.text] = { address: liquidAddress, tx };
    }

    if (!user) ({ user } = req);
    else {
      user = await db.User.findOne({
        where: {
          username: user.username
        }
      });
    }
    if (!user) throw new Error("user not provided");
    if (!invoice.currency) invoice.currency = user.currency;
    if (!invoice.rate) invoice.rate = store.rates[invoice.currency];
    if (invoice.tip > invoice.amount || invoice.tip > 1000000)
      throw new Error("tip is too large");
    if (invoice.tip < 0 || invoice.amount < 0)
      throw new Error("invalid amount");
    invoice.user_id = user.id;
    invoice.account_id = user.account_id;

    l(
      "creating invoice",
      user.username,
      invoice.network,
      invoice.amount,
      invoice.tip,
      invoice.currency,
      invoice.text && `${invoice.text.substr(0, 8)}..${invoice.text.substr(-6)}`
    );

    if (!invoice.tip) invoice.tip = 0;

    const exists =
      invoice.text &&
      (await db.Invoice.findOne({
        where: {
          [Op.or]: {
            address: invoice.address || "",
            unconfidential: invoice.unconfidential || "",
            text: invoice.text
          }
        }
      }));

    invoice = exists
      ? await exists.update(invoice)
      : await db.Invoice.create(invoice);
    store.addresses[invoice.address] = user.username;
    if (invoice.unconfidential) {
      store.addresses[invoice.unconfidential] = user.username;
      if (blindkey) await lq.importBlindingKey(invoice.address, blindkey);
    }

    res.send(invoice);
  } catch (e) {
    err(e.message, e.stack);
    res.code(500).send(`Problem during invoice creation: ${e.message}`);
  }
});

app.post(
  "/:username/:network/invoice",
  optionalAuth,
  async (req, res, next) => {
    let { network, username } = req.params;
  }
);
