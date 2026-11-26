/* One Piece Life Simulator — Roger-era story events.
 * Registers a small, replay-safe encounter arc into the existing OP world.
 * The game keeps ownership of S, save/load, event execution and UI.
 */
(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceRogerEraContent = api;

  // This file is loaded after the main game script so its existing lexical
  // world, cast and helper bindings are available. If loaded elsewhere, it
  // remains a pure module and can be registered explicitly by the game layer.
  try {
    if (typeof WORLDS !== 'undefined' && WORLDS.op &&
        typeof CAST !== 'undefined' && CAST.op &&
        typeof bond === 'function' && typeof say === 'function') {
      api.register(WORLDS.op, CAST.op, {
        bond, say, st, skill, fm, remember, pirate, marine
      });
      api.installEraPreset(document, cfg, setupRender);
    }
  } catch (error) {
    root.__onePieceRogerEraError = String(error && error.message || error);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROGER_ERA_START = 1470;
  const ROGER_EXECUTION_YEAR = 1500;
  const EVENT_IDS = [
    'op_roger_rumor',
    'op_roger_sighting',
    'op_roger_meeting',
    'op_roger_rescue',
    'op_roger_training',
    'op_roger_alliance',
    'op_roger_recruitment',
    'op_roger_marine_report'
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function inRogerEra(state) {
    return !!state && Number(state.year) >= ROGER_ERA_START &&
      Number(state.year) < ROGER_EXECUTION_YEAR;
  }

  function addTrust(state, amount) {
    state.flags = state.flags || {};
    state.flags.rogerTrust = clamp(
      (Number(state.flags.rogerTrust) || 0) + amount, 0, 100
    );
  }

  function register(world, cast, helpers = {}) {
    if (!world || typeof world !== 'object' || !cast || typeof cast !== 'object') {
      return { registered: 0, ids: [], reason: 'invalid-world-or-cast' };
    }

    Object.assign(cast, {
      roger: 'โกล ดี. โรเจอร์',
      rayleigh: 'ซิลเวอร์ส เรย์ลี',
      gaban: 'สกอปเปอร์ แกบบัน',
      buggy: 'บากี้'
    });

    const existing = Array.isArray(world.meets) ? world.meets : [];
    const existingIds = new Set(existing.map(event => event && event.id));
    const h = helpers;
    const events = [
      {
        id: 'op_roger_rumor', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 12 && !s.flags?.rogerRumor,
        play(s) {
          return {
            text: 'ที่ท่าเรือ คุณได้ยินกะลาสีสองคนถกเถียงกันถึงกลุ่มโจรสลัดโรเจอร์ บางคนบอกว่าพวกเขาเป็นปีศาจแห่งท้องทะเล อีกคนยืนยันว่าโรเจอร์เป็นกัปตันที่รักษาคำพูด',
            choices: [
              { l: 'ถามข่าวเกี่ยวกับเส้นทางของพวกเขา', g: 'curious brave', f(state) {
                state.flags.rogerRumor = 1;
                state.flags.rogerLead = 1;
                if (h.remember) h.remember('ข่าวลือของโรเจอร์', 'คุณเริ่มสนใจเส้นทางของกลุ่มโจรสลัดโรเจอร์', 'curious', 2);
                if (h.say) h.say('คุณจดชื่อเกาะและเส้นทางที่กะลาสีพูดถึงไว้','good');
              }},
              { l: 'ฟังไว้ แต่ไม่เข้าไปยุ่ง', g: 'safe', f(state) {
                state.flags.rogerRumor = 1;
                if (h.say) h.say('คุณปล่อยให้ข่าวลือนั้นผ่านไปพร้อมเสียงคลื่น','plain');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_sighting', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 14 && s.place === 'sea' &&
          !s.flags?.rogerSighting,
        play(s) {
          return {
            text: 'กลางทะเล เรือโจรสลัดลำหนึ่งแล่นตัดขอบฟ้า ธงของพวกเขาไม่ใช่ธงที่คุณคุ้นเคย ลูกเรือบนดาดฟ้าพูดถึงชื่อโรเจอร์',
            choices: [
              { l: 'เข้าไปใกล้เพื่อดูให้ชัด', g: 'brave curious', f(state) {
                state.flags.rogerSighting = 1;
                state.flags.rogerLead = 1;
                if (h.say) h.say('เรือของคุณแล่นเข้าใกล้พอจะเห็นรอยยิ้มของลูกเรือบนเรือลำนั้น','good');
              }},
              { l: 'รักษาระยะและปล่อยให้พวกเขาผ่านไป', g: 'safe', f(state) {
                state.flags.rogerSighting = 1;
                state.flags.rogerLead = 0;
                if (h.say) h.say('คุณมองเรือลำนั้นหายไปหลังม่านหมอก');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_meeting', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 16 && s.place === 'sea' &&
          !!s.flags?.rogerLead && !s.flags?.rogerMet,
        play(s) {
          return {
            text: 'เรือของคุณแล่นมาบรรจบกับเรืออีกลำ ชายผมสีทองแดงยืนอยู่หัวเรือ เขาแนะนำตัวว่าโกล ดี. โรเจอร์ กัปตันของกลุ่มโจรสลัดที่คุณได้ยินชื่อมานาน',
            choices: [
              { l: 'ทักทายและพูดคุยกับโรเจอร์', g: 'kind brave', f(state) {
                state.flags.rogerMet = 1;
                addTrust(state, 8);
                if (h.bond) h.bond('roger', 7);
                if (h.remember) h.remember('พบโกล ดี. โรเจอร์', 'คุณได้พบกัปตันผู้มีรอยยิ้มและความฝันยิ่งใหญ่', 'roger', 3);
                if (h.say) h.say('โรเจอร์หัวเราะเสียงดัง ก่อนชวนคุณคุยราวกับรู้จักกันมานาน','good');
              }},
              { l: 'ถามถึงการเดินทางและทะเลที่ยังไม่เคยเห็น', g: 'curious', f(state) {
                state.flags.rogerMet = 1;
                addTrust(state, 6);
                if (h.bond) h.bond('roger', 5);
                if (h.bond) h.bond('rayleigh', 2);
                if (h.remember) h.remember('สนทนากับโรเจอร์', 'คุณได้ฟังเรื่องราวการเดินทางจากกัปตันกลุ่มโจรสลัดโรเจอร์', 'travel', 2);
                if (h.say) h.say('โรเจอร์เล่าเรื่องทะเลด้วยแววตาเป็นประกาย เรย์ลีห์ยืนฟังอยู่ข้างหลัง','good');
              }},
              { l: 'ทักทายอย่างสุภาพแล้วกลับไปยังเรือของตน', g: 'safe', f(state) {
                state.flags.rogerMet = 1;
                addTrust(state, 1);
                if (h.bond) h.bond('roger', 1);
                if (h.say) h.say('โรเจอร์ยกมือโบกลาโดยไม่รั้งคุณไว้');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_rescue', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 16 && s.place === 'sea' &&
          !!s.flags?.rogerMet && !s.flags?.rogerRescue,
        play(s) {
          return {
            text: 'ระหว่างเดินเรือ คุณพบลูกเรือของโรเจอร์กำลังรับมือกับโจรสลัดอีกกลุ่ม เรือของพวกเขาเสียหายและมีคนบาดเจ็บ',
            choices: [
              { l: 'ขึ้นไปช่วยต่อสู้เคียงข้างพวกเขา', g: 'brave loyal', f(state) {
                state.flags.rogerRescue = 1;
                addTrust(state, 12);
                if (h.bond) h.bond('roger', 5);
                if (h.bond) h.bond('rayleigh', 5);
                if (h.skill) h.skill('fight', 2);
                if (h.remember) h.remember('ต่อสู้เคียงข้างลูกเรือโรเจอร์', 'คุณยืนหยัดเคียงข้างพวกเขาในวันที่เรือถูกโจมตี', 'battle', 3);
                if (h.say) h.say('หลังการต่อสู้ ลูกเรือโรเจอร์ยอมรับในความกล้าของคุณ','good');
              }},
              { l: 'ช่วยซ่อมเรือและดูแลผู้บาดเจ็บ', g: 'kind practical', f(state) {
                state.flags.rogerRescue = 1;
                addTrust(state, 10);
                if (h.bond) h.bond('rayleigh', 5);
                if (h.skill) h.skill('craft', 2);
                if (h.remember) h.remember('ช่วยเหลือลูกเรือโรเจอร์', 'คุณช่วยซ่อมเรือและดูแลผู้บาดเจ็บหลังเหตุโจมตี', 'help', 2);
                if (h.say) h.say('เรย์ลีห์ขอบคุณที่คุณช่วยให้ทุกคนเดินทางต่อได้','good');
              }},
              { l: 'ไม่เสี่ยงและเดินทางต่อ', g: 'safe', f(state) {
                state.flags.rogerRescue = 1;
                if (h.say) h.say('คุณตัดสินใจไม่เข้าไปเกี่ยวข้องกับการต่อสู้ครั้งนี้');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_training', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 16 && s.place === 'sea' &&
          !!s.flags?.rogerMet && (Number(s.flags?.rogerTrust) || 0) >= 8 &&
          !s.flags?.rogerTrainingSeen,
        play(s) {
          return {
            text: 'เรย์ลีห์เห็นความตั้งใจของคุณ จึงเสนอให้ฝึกพื้นฐานระหว่างเดินทาง เขาบอกว่าพลังที่แท้จริงต้องเริ่มจากวินัยและประสบการณ์',
            choices: [
              { l: 'ฝึกการต่อสู้และการป้องกันตัว', g: 'brave', f(state) {
                state.flags.rogerTrainingSeen = 1;
                state.flags.rogerTraining = 1;
                addTrust(state, 4);
                if (h.skill) h.skill('fight', 4);
                if (h.bond) h.bond('rayleigh', 7);
                if (h.remember) h.remember('ฝึกกับเรย์ลีห์', 'คุณเริ่มฝึกพื้นฐานการต่อสู้ภายใต้คำแนะนำของเรย์ลีห์', 'training', 3);
                if (h.say) h.say('การฝึกหนักกว่าที่คิด แต่คุณเริ่มเข้าใจจังหวะของการต่อสู้','good');
              }},
              { l: 'ฝึกการเดินเรือและอ่านเส้นทาง', g: 'curious patient', f(state) {
                state.flags.rogerTrainingSeen = 1;
                state.flags.rogerTraining = 1;
                addTrust(state, 4);
                if (h.skill) h.skill('ride', 4);
                if (h.bond) h.bond('rayleigh', 7);
                if (h.remember) h.remember('เรียนรู้จากเรย์ลีห์', 'คุณฝึกอ่านทิศลมและวางแผนเส้นทางเดินเรือ', 'training', 2);
                if (h.say) h.say('เรย์ลีห์สอนให้คุณอ่านท้องฟ้าและกระแสน้ำก่อนตัดสินใจ');
              }},
              { l: 'ขอบคุณ แต่ขอเดินทางด้วยวิธีของตัวเอง', g: 'independent', f(state) {
                state.flags.rogerTrainingSeen = 1;
                if (h.say) h.say('เรย์ลีห์ยิ้มและบอกว่าทะเลมีบทเรียนให้ทุกคนอยู่แล้ว');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_alliance', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 17 && s.place === 'sea' &&
          !!s.flags?.rogerMet && (Number(s.flags?.rogerTrust) || 0) >= 18 &&
          typeof h.pirate === 'function' && h.pirate(s) &&
          !s.flags?.rogerAlliance,
        play(s) {
          return {
            text: 'โรเจอร์เสนอให้เรือของคุณร่วมมือกับกลุ่มของเขาในภารกิจหนึ่ง เป้าหมายคือช่วยเรือสินค้าที่ถูกโจรสลัดไล่ล่า',
            choices: [
              { l: 'ตอบรับและร่วมเป็นพันธมิตรชั่วคราว', g: 'loyal brave', f(state) {
                state.flags.rogerAlliance = 1;
                addTrust(state, 8);
                if (h.bond) h.bond('roger', 8);
                if (h.fm) h.fm(3);
                if (h.remember) h.remember('เป็นพันธมิตรกับกลุ่มโรเจอร์', 'คุณร่วมภารกิจกับกลุ่มโจรสลัดโรเจอร์ในฐานะพันธมิตรชั่วคราว', 'alliance', 3);
                if (h.say) h.say('เรือทั้งสองลำออกเดินทางไปยังเป้าหมายเดียวกัน','good');
              }},
              { l: 'ปฏิเสธ เพราะยังมีเส้นทางของตัวเอง', g: 'independent', f(state) {
                state.flags.rogerAllianceDeclined = 1;
                if (h.say) h.say('โรเจอร์ยอมรับการตัดสินใจของคุณและไม่บังคับให้เปลี่ยนเส้นทาง');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_recruitment', once: 1, w: 1,
        when: s => inRogerEra(s) && s.age >= 18 && s.place === 'sea' &&
          !!s.flags?.rogerAlliance && (Number(s.flags?.rogerTrust) || 0) >= 28 &&
          s.job?.id === 'pirate' &&
          ((Number(s.sk?.fight) || 0) >= 25 || (Number(s.sk?.ride) || 0) >= 25) &&
          !s.flags?.rogerCrew && !s.flags?.rogerRecruitmentDeclined,
        play(s) {
          return {
            text: 'หลังจากร่วมเดินทางและผ่านเหตุการณ์หลายครั้ง โรเจอร์เรียกคุณไปคุยเป็นการส่วนตัว เขาบอกว่าลูกเรือของเขาเห็นความสามารถและความจริงใจของคุณ หากต้องการ คุณสามารถร่วมเดินทางกับพวกเขาในฐานะลูกเรือได้',
            choices: [
              { l: 'ตอบรับและเข้าร่วมกลุ่มโจรสลัดโรเจอร์', g: 'loyal brave', f(state) {
                state.flags.previousCrew = state.flags.crew || null;
                state.flags.crew = 'กลุ่มโจรสลัดโรเจอร์';
                state.flags.rogerCrew = 1;
                if (h.bond) h.bond('roger', 12);
                if (h.bond) h.bond('rayleigh', 8);
                if (h.remember) h.remember('เข้าร่วมกลุ่มโจรสลัดโรเจอร์', 'คุณได้รับการยอมรับให้ร่วมเดินทางกับกลุ่มของโรเจอร์', 'crew', 4);
                if (h.say) h.say('คุณก้าวขึ้นเรือของโรเจอร์ การเดินทางครั้งใหม่เริ่มต้นขึ้นแล้ว','good');
              }},
              { l: 'ขอเดินทางในฐานะพันธมิตรต่อไป', g: 'independent', f(state) {
                state.flags.rogerRecruitmentDeclined = 1;
                if (h.say) h.say('โรเจอร์หัวเราะและบอกว่าหากเปลี่ยนใจ เรือของเขายังมีที่ว่างเสมอ');
              }},
              { l: 'ปฏิเสธ เพราะมีครอบครัวหรือเป้าหมายของตัวเอง', g: 'safe independent', f(state) {
                state.flags.rogerRecruitmentDeclined = 1;
                if (h.say) h.say('โรเจอร์เคารพการตัดสินใจของคุณ และอวยพรให้เดินทางปลอดภัย');
              }}
            ]
          };
        }
      },
      {
        id: 'op_roger_marine_report', once: 1, w: 2,
        when: s => inRogerEra(s) && s.age >= 16 && s.place === 'sea' &&
          !!s.flags?.rogerSighting && typeof h.marine === 'function' &&
          h.marine(s) && !s.flags?.rogerRival,
        play(s) {
          return {
            text: 'คุณได้รับคำสั่งจากกองทัพเรือให้รายงานเรือโจรสลัดที่พบกลางทะเล ลูกเรือยืนยันว่าเป็นเรือของกลุ่มโรเจอร์',
            choices: [
              { l: 'รายงานตำแหน่งให้กองทัพเรือ', g: 'obey', f(state) {
                state.flags.rogerRival = 1;
                if (h.bond) h.bond('roger', -8);
                if (h.say) h.say('ข่าวการพบเห็นถูกส่งต่อไปยังฐานทัพเรือ','bad');
              }},
              { l: 'รายงานว่าไม่พบเรือที่น่าสงสัย', g: 'rebel kind', f(state) {
                state.flags.rogerRival = 1;
                if (h.bond) h.bond('roger', 3);
                if (h.say) h.say('คุณปล่อยให้เรือของโรเจอร์แล่นผ่านไปโดยไม่เปิดเผยตำแหน่ง','plain');
              }}
            ]
          };
        }
      }
    ];

    const additions = events.filter(event => !existingIds.has(event.id));
    world.meets = existing.concat(additions);
    return { registered: additions.length, ids: additions.map(event => event.id) };
  }

  function applyEraPreset(config, year = 1475) {
    const next = { ...(config || {}) };
    next.year = clamp(Math.floor(Number(year) || 1475), ROGER_ERA_START, ROGER_EXECUTION_YEAR - 1);
    return next;
  }

  function installEraPreset(doc, config, rerender) {
    if (!doc || !config || typeof rerender !== 'function') return false;
    const yearInput = doc.getElementById('yearIn');
    const field = yearInput && yearInput.closest('.field');
    if (!field || doc.getElementById('rogerEraPreset')) return false;

    const button = doc.createElement('button');
    button.type = 'button';
    button.id = 'rogerEraPreset';
    button.className = 'ghost';
    button.textContent = 'เริ่มชีวิตในยุคโรเจอร์ (ปี 1475)';
    button.setAttribute('aria-label', 'เลือกเริ่มชีวิตในยุคโรเจอร์ ปี 1475');
    button.addEventListener('click', () => {
      Object.assign(config, applyEraPreset(config, 1475));
      rerender();
    });

    const note = doc.createElement('p');
    note.className = 'fine';
    note.textContent = 'คุณจะเริ่มตั้งแต่เกิด และเติบโตในช่วงที่โรเจอร์ยังออกทะเล ก่อนเหตุการณ์ประหารในปี 1500 ของไทม์ไลน์เกม';

    const holder = doc.createElement('div');
    holder.className = 'btnrow';
    holder.append(button);
    field.append(holder, note);
    return true;
  }

  return Object.freeze({
    ROGER_ERA_START,
    ROGER_EXECUTION_YEAR,
    EVENT_IDS,
    inRogerEra,
    register,
    applyEraPreset,
    installEraPreset
  });
});
