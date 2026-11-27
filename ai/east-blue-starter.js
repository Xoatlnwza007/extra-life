/* One Piece Life Simulator — original East Blue starter side-story.
 * These events are explicitly sandbox/original content, not manga canon.
 * The factory receives the legacy game's effect helpers and preserves its
 * existing event/choice contract.
 */
(function (root) {
  'use strict';

  function create(api = {}) {
    const call = (name, ...args) => {
      if (typeof api[name] === 'function') return api[name](...args);
      return undefined;
    };
    const flag = (state, key, value = 1) => {
      state.flags = state.flags || {};
      state.flags[key] = value;
    };

    return [
      {
        id: 'op_eb_toma_net',
        t: '[เนื้อเรื่องเสริม] อวนที่หายไป',
        once: 1,
        w: 10,
        origin: 'original',
        canonStatus: 'sandbox',
        when: S => S.place === 'foosha' && S.age >= 8 && S.age <= 18 && !S.flags?.eb_toma_met,
        play() {
          return {
            text: 'ชาวประมงชื่อโทมะกำลังตามหาอวนกับลังเสบียงที่กระแสน้ำพัดหายไป เขาขอให้คุณช่วยก่อนที่แสงสุดท้ายจะหมดลง',
            choices: [
              {
                l: 'ช่วยเดินสำรวจแนวโขดหิน',
                g: 'kind help brave',
                f(S) {
                  flag(S, 'eb_toma_met');
                  flag(S, 'eb_net_found');
                  call('bond', 'eb_toma', 12);
                  call('skill', 'ride', 2);
                  call('st', 'joy', 3);
                  call('say', 'คุณพบอวนติดอยู่กับโขดหินและช่วยลากกลับมา โทมะจำความช่วยเหลือของคุณไว้', 'good');
                }
              },
              {
                l: 'ช่วยตามหา แต่ขอค่าตอบแทนเล็กน้อย',
                g: 'ambitious trade',
                f(S) {
                  flag(S, 'eb_toma_met');
                  flag(S, 'eb_net_found');
                  call('bond', 'eb_toma', 5);
                  call('mon', 4);
                  call('say', 'คุณช่วยโทมะกู้เสบียงกลับมาได้ เขาจ่ายค่าตอบแทนตามที่ตกลง', 'good');
                }
              },
              {
                l: 'ถามชาวบ้านให้ช่วยกันค้นหา',
                g: 'curious kind',
                f(S) {
                  flag(S, 'eb_toma_met');
                  flag(S, 'eb_net_found');
                  call('bond', 'eb_toma', 8);
                  call('skill', 'charm', 1);
                  call('say', 'ข่าวแพร่ไปทั่วหมู่บ้าน ไม่นานทุกคนก็ช่วยกันหาอวนจนพบ', 'good');
                }
              }
            ]
          };
        }
      },
      {
        id: 'op_eb_dock_repair',
        t: '[เนื้อเรื่องเสริม] ซ่อมท่าเรือก่อนน้ำขึ้น',
        once: 1,
        w: 10,
        origin: 'original',
        canonStatus: 'sandbox',
        when: S => S.place === 'foosha' && S.age >= 9 && !!S.flags?.eb_net_found && !S.flags?.eb_boat_repaired,
        play() {
          return {
            text: 'หลังจากได้อวนคืน โทมะชวนคุณไปดูเรือประมงลำเล็กที่เชือกผูกกับท่าเรือเริ่มขาด ไม้กระดานบางแผ่นก็หลวมจนเดินแทบไม่ได้',
            choices: [
              {
                l: 'ช่วยช่างไม้เปลี่ยนกระดาน',
                g: 'craft help diligent',
                f(S) {
                  flag(S, 'eb_boat_repaired');
                  call('bond', 'eb_toma', 8);
                  call('skill', 'craft', 3);
                  call('say', 'คุณช่วยยึดกระดานและตรวจเชือกผูกเรือจนแน่นหนา', 'good');
                }
              },
              {
                l: 'รวบรวมเพื่อนบ้านมาช่วยกัน',
                g: 'kind leader',
                f(S) {
                  flag(S, 'eb_boat_repaired');
                  call('bond', 'eb_toma', 10);
                  call('skill', 'charm', 2);
                  call('st', 'joy', 2);
                  call('say', 'ทุกคนช่วยกันซ่อมท่าเรือ งานที่ดูหนักจึงเสร็จก่อนน้ำขึ้น', 'good');
                }
              },
              {
                l: 'เรียนรู้วิธีผูกปมและซ่อมเชือก',
                g: 'curious diligent',
                f(S) {
                  flag(S, 'eb_boat_repaired');
                  call('bond', 'eb_toma', 6);
                  call('skill', 'ride', 2);
                  call('say', 'โทมะสอนปมเชือกสำหรับเรือให้คุณจนจำได้ขึ้นใจ', 'good');
                }
              }
            ]
          };
        }
      },
      {
        id: 'op_eb_delivery_chart',
        t: '[เนื้อเรื่องเสริม] แผนที่จากคนส่งของ',
        once: 1,
        w: 10,
        origin: 'original',
        canonStatus: 'sandbox',
        when: S => S.place === 'foosha' && S.age >= 10 && !!S.flags?.eb_boat_repaired && !S.flags?.eb_chart_received,
        play() {
          return {
            text: 'คนส่งของจากท่าเรือฝากห่อเอกสารไว้กับโทมะ ข้างในมีแผนที่เส้นทางชายฝั่งที่เขียนด้วยมือและคำเตือนเรื่องแนวหินใต้น้ำ',
            choices: [
              {
                l: 'อ่านแผนที่และจดจำแนวชายฝั่ง',
                g: 'curious study',
                f(S) {
                  flag(S, 'eb_chart_received');
                  call('bond', 'eb_toma', 5);
                  call('st', 'iq', 2);
                  call('skill', 'ride', 2);
                  call('say', 'คุณจำสัญลักษณ์บนแผนที่ได้หลายจุด และเก็บสำเนาไว้เป็นของตัวเอง', 'good');
                }
              },
              {
                l: 'นำเอกสารไปส่งให้เจ้าของร้านที่ท่าเรือ',
                g: 'kind obey',
                f(S) {
                  flag(S, 'eb_chart_received');
                  call('bond', 'eb_toma', 8);
                  call('mon', 3);
                  call('say', 'คุณส่งเอกสารถึงมือเจ้าของร้านทันเวลา เขามอบเงินเล็กน้อยเป็นคำขอบคุณ', 'good');
                }
              },
              {
                l: 'ถามโทมะเกี่ยวกับเส้นทางเรือ',
                g: 'curious',
                f(S) {
                  flag(S, 'eb_chart_received');
                  call('bond', 'eb_toma', 10);
                  call('skill', 'ride', 3);
                  call('say', 'โทมะเล่าเรื่องกระแสน้ำและจุดที่เรือเล็กควรหลีกเลี่ยง', 'good');
                }
              }
            ]
          };
        }
      },
      {
        id: 'op_eb_harbor_storm',
        t: '[เนื้อเรื่องเสริม] สัญญาณเตือนก่อนพายุ',
        once: 1,
        w: 12,
        origin: 'original',
        canonStatus: 'sandbox',
        when: S => S.place === 'foosha' && S.age >= 12 && !!S.flags?.eb_chart_received && !S.flags?.eb_starter_complete,
        play() {
          return {
            text: 'เมฆดำก่อตัวเหนืออ่าวเร็วกว่าปกติ เรือประมงสองลำยังอยู่ด้านนอก โทมะมองไปที่ระฆังเตือนภัยแล้วหันมาถามว่าคุณจะช่วยอย่างไร',
            choices: [
              {
                l: 'ช่วยผูกเรือและเก็บของบนท่า',
                g: 'brave help craft',
                f(S) {
                  flag(S, 'eb_starter_complete');
                  flag(S, 'eb_starter_outcome', 'secured-boats');
                  call('bond', 'eb_toma', 12);
                  call('skill', 'craft', 2);
                  call('st', 'fit', 2);
                  call('say', 'เรือทุกลำถูกผูกไว้อย่างแน่นหนาก่อนฝนชุดแรกจะมาถึง', 'good');
                }
              },
              {
                l: 'ตีระฆังเตือนและพาคนขึ้นที่สูง',
                g: 'kind leader safe',
                f(S) {
                  flag(S, 'eb_starter_complete');
                  flag(S, 'eb_starter_outcome', 'warned-village');
                  call('bond', 'eb_toma', 10);
                  call('skill', 'charm', 2);
                  call('st', 'joy', 2);
                  call('say', 'เสียงระฆังทำให้ชาวบ้านเก็บของและพากันขึ้นไปยังเนินสูงทันเวลา', 'good');
                }
              },
              {
                l: 'ช่วยโทมะพาเด็กๆ ออกจากแนวชายฝั่ง',
                g: 'brave kind hero',
                f(S) {
                  flag(S, 'eb_starter_complete');
                  flag(S, 'eb_starter_outcome', 'escorted-children');
                  call('bond', 'eb_toma', 14);
                  call('st', 'fit', 2);
                  call('say', 'คุณพาเด็กๆ ไปยังที่ปลอดภัย โทมะขอบคุณที่ไม่ทิ้งใครไว้ข้างหลัง', 'good');
                }
              }
            ]
          };
        }
      }
    ];
  }

  const api = Object.freeze({ create });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OnePieceEastBlueStarter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
