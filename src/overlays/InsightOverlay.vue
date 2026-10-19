<template>
  <div v-if="isOpen" :style="{ top: top, left: left, width: width, transform: `translate(${translateX}, ${translateY})` }" class="absolute z-[1000] border border-slate-500/30 flex flex-col rounded bg-white px-6 py-2 text-left shadow-xl transition-all pointer-events-none">
    
    <div :style="{ left: arrowLeft, top: arrowTop, bottom: arrowBottom, right: arrowRight, rotate: positionAt === 'top' ? '180deg' : '0deg', transform: `translate(${arrowTranslateX}, -100%)` }" class="absolute">
      <svg class="relative z-10" width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L24 12H0L12 0Z" fill="white"/>
      </svg>
      <svg class="absolute z-0 -top-0.5 left-[-0.5px] opacity-20" width="26" height="14" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L24 12H0L12 0Z" fill="black"/>
      </svg>
    </div>
    
    <div class="grow">
      <div :style="{ textAlign }" class="py-3 text-left text-sm text-slate-500 font-light">
        
        <div v-if="id === 'bitcoinCoverage'" class="space-y-2">
          <p>Bitcoins play a pivotal role in the Argon ecosystem. Vaulted bitcoin are required to burn a predetermined amount of argons to unlock. This amount fluctuates based on
            Argon's price. When Argon's price is below target, the mathematical formula creates a massive wall of shorts that consumes all excess tokens.</p>
          <div class="flex flex-row justify-around text-center pt-5">
            <div class="pb-2 flex flex-col space-x-2">
              <div class="text-xl font-bold">{{ addCommas(Math.round(item.endingVaultMeta.bitcoinCount)) }}</div>
              <div>Vaulted Bitcoins</div>
            </div>
            <div class="pb-2 flex flex-col space-x-2">
              <div class="text-xl font-bold">{{ addCommas(item.endingVaultMeta.bitcoinCount - item.startingVaultMeta.bitcoinCount, 2) }}</div>
              <div>Vaulted Today</div>
            </div>
          </div>
          <p>Bitcoins can only be added when the ratio of argons minted by bitcoins is less than 50% of circulation. At the start of {{ dayjs.utc(item.startingDate).format('MMM D') }}, Argons minted by Bitcoin was at {{ ((item.startingVaultMeta.argonsMintedByBitcoins / item.startingCirculation) * 100).toFixed(2) }}%, which meant {{ Math.round((item.startingCirculation/2) - item.startingVaultMeta.argonsMintedByBitcoins) }} new argons could be minted.</p>
          <p>For more details see pages 12-14 of <em>Whitepaper #2</em>.</p>
        </div>

        <div v-if="id === 'bitcoinProfits'" class="space-y-2">
          <p>Bitcoins are heavily incentived to participate in Argon vaults for multiple reasons. In addition to hedging Bitcoin price drops, vaults allow bitcoins to earn ratcheting yields when Bitcoin's price fluctuates as well as from covering shorts whenever Argon's price drops.</p>
          <p>To better understand the incentives for bitcoins to enter Argon vaults, see <em>Whitepaper #2</em> or explore our Liquid Locking simulation tool.</p>
        </div>

        <div v-if="id === 'argonRelativeToDollar'" class="space-y-2">
          <p>This compares the simulated Argon price ratio with a dollar purchasing-power index that starts at 1.00 and declines with modeled inflation. It is a relative comparison, not a historical USD exchange-rate series. Dollar readouts use the frozen mainnet target of ${{ formatPrice(rules.usdTargetForArgon, 3) }} throughout the run.</p>
        </div>

        <div v-if="id === 'argonLosses'" class="space-y-2">
          <p>Due to the way pricing incentives are placed on both sides of Argon's price, the only loser during a price drop is the person who sells below target due to fear or some other panic. The flip side of the trade are the vaulted bitcoins who profit, and of course, the currency itself which restabilizes due to the burning of excess tokens.</p>
        </div>

        <div v-if="id === 'seigniorageProfits'" class="space-y-2">
          <p>Argon's stabilization mechanisms have no need for U.S. Treasury Bonds or reserve accounts. This allows for a seigniorage business model, which means all incoming capital accrues directly to the network's Argonots and network mining nodes..</p>
        </div>

        <div v-if="id === 'seigniorageLosses'" class="space-y-2">
          <p>In no circumstance will Argonots incur losses due to Argon instability. The token's primary purpose is to provide governance oversight and absorb excess capital when Argon's price rises above target. If Argon drops below target, instead of penalizing Argonots, other mechanisms are used to restabilize.</p>
        </div>

        <div v-if="id === 'annualTransactions'" class="space-y-2">
          <p>
            All Argon Sidechain transactions are modeled with a flat ₳0.20 tax regardless of whether the transaction is valued at $2 or $2B. The stat shown above is the total number of
            annual transactions across the entire network. You can customize this property in your model's configuration settings.
          </p>
        </div>

        <div v-if="id === 'annualMicropayments'" class="space-y-2">
          <p>Micropayments are categorized as any Sidechain transaction valued at less than $1.00. The network enacts a 20% tax on these transactions. Due to Argon's novel Wage Protection algorithm, the quantity of taxes that are burned when Argon's price drops below target rises substantially. See <em>Whitepapers</em> for more details.</p>
        </div>
        
        <!-- ---------------------------------------------------- -->

        <div v-if="id === 'price'" class="space-y-2">
          <p>
            <template v-if="item.startingPrice === item.lowestPrice && item.lowestPrice === item.endingPrice">The price of Argon has remained steady at ${{ formatPrice(usd(item.startingPrice), 3)}} throughout the entire day.</template>
            <template v-else>The price of Argon started at ${{ formatPrice(usd(item.startingPrice), 3)}} on the morning of {{ dayjs.utc(item.startingDate).format('MMM D') }}. It then dropped to ${{ formatPrice(usd(item.lowestPrice), 3)}} before finishing at ${{ formatPrice(usd(item.endingPrice), 3)}}. </template>
            SAM converts its modeled price ratio using the frozen ${{ formatPrice(rules.usdTargetForArgon, 3) }} target:
          </p>
          <p class="monospace italic bg-slate-100/100 px-2 py-1 rounded-md">USD Price = (Modeled Capital / Circulating ARGN) × USD Target</p>
          <p>Explore the rest of this page to see the details.</p>
        </div>

        <div v-if="id === 'unbalanced'" class="space-y-2">
          <p v-if="item.endingCapital === item.endingCirculation">This is required for the price to be stable.</p>
          <p v-if="item.endingCapital < item.endingCirculation">The system must remove excess circulation (supply) before the price can restabilize.</p>
        </div>

        <!-- ---------------------------------------------------- -->

        <div v-if="id === 'bitcoinUnlocking'" class="space-y-2">
          <template v-if="item.circulationRemovedMap.BitcoinFusion">
            <p>{{ addCommas(Math.round(item.circulationRemovedMap.BitcoinFusion || 0)) }} tokens were burned from circulation as bitcoins were unlocked from vaults. Although bitcoins can unlock at any time, the SAM model only triggers them when a guaranteed profit is available due to Argon dropping below its target price.</p>
            <p>The {{ addCommas(item.startingVaultMeta.bitcoinCount - item.endingVaultMeta.bitcoinCount, 2) }} bitcoins that took advantage of this short earned an average profit of 35%.</p>            
          </template>
          <p v-else>
            <template v-if="item.endingPrice === 1.00">No bitcoins were unlocked from vaults and therefore no argons were burned from circulation because Argon's price was at target. Although bitcoins can unlock at any time, the SAM model only triggers unlocking when there is a guaranteed profit to be made due to Argon dropping below target.</template>
            <template v-else-if="!item.endingVaultMeta.bitcoinCount">There are no vaulted bitcoins to unlock, and therefore, no argons were burned from circulation.</template>
            <template v-else>{{ addCommas(Math.round(item.startingVaultMeta.bitcoinCount))}} bitcoins are vaulted and available for unlocking. However, none of these bitcoins are being used to stabilize the price due to this model's configuration. All stabilization mechanisms have been disabled during this "{{ item.phase }}" phase. If enabled, the price would restabilize within days.</template>
          </p>
          <p>See pages 12-14 of <em>Whitepaper #2</em> to learn more about bitcoin unlocking.</p>
        </div>

        <div v-if="id === 'taxedMicropayments'" class="space-y-2">
          <template v-if="item.circulationRemovedMap.MicropaymentTaxes">
            <p>₳{{ formatShorthandNumber(item.circulationRemovedMap.MicropaymentTaxes) }} was burned from circulation through micropayments taxation (20% of ₳{{ formatShorthandNumber(Marker.calculateWageProtectedPrice(item.annualMicropayments, item.lowestPrice)) }} annually). Learn more about this in <em>Whitepaper #2</em>.</p>
          </template>
          <template v-else>
            <p>The system has ₳{{ formatShorthandNumber(Marker.calculateWageProtectedPrice(item.annualMicropayments, item.lowestPrice) * 0.2/365) }}) in daily taxable burns from reocurring micropayments (20% of ₳{{ formatShorthandNumber(Marker.calculateWageProtectedPrice(item.annualMicropayments, item.lowestPrice)) }} in annual reocurring revenue). However, none of these taxes are currently being used. The model's configuration has disabled all stabilization mechanisms (such as taxes) during this "{{ item.phase }}" phase.</p>
          </template>
        </div>

        <div v-if="id === 'taxedTransactions'" class="space-y-2">
          <template v-if="item.circulationRemovedMap.TransactionalTaxes">
            <p>₳{{ formatShorthandNumber(item.circulationRemovedMap.TransactionalTaxes) }} was burned from circulation through transactional taxes (₳0.20 per transaction). Learn more about this in <em>Whitepaper #2</em>.</p>
          </template>
          <template v-else>
            <p>The system has ₳{{ formatShorthandNumber(item.annualTransactions * 0.2/365) }} transactional taxes burned from circulation each day (₳0.20 per transaction). However, none of these are currently being used to stabilize the price. The model's configuration has disabled all stabilization mechanisms (such as taxes) during this "{{ item.phase }}" phase.</p>
          </template>
        </div>


        <p v-if="id === 'terraCirculationIncrease'" class="space-y-2">
          During its rise in popularity, the inflow of new capital required an average of ₳{{formatShorthandNumber(item.circulationAddedMap.TerraGrowth, 2)}} in new tokens to be created on a daily basis. SAM follows the same process with Argon in order to create a realistic recreation of Terra's $18.7B implosion.          
        </p>

        <p v-if="id === 'terraCirculationDecrease'" class="space-y-2">
          <template v-if="previousItem.circulationRemovedMap.ReserveSpend">
            At the start of Terra's collapase, the foundation had $3B of reserve capital which it used to buy and burn tokens out of circulation. They hoped that such action would restabilize the asset. Our SAM model follows the same process in order to create a realistic Argon recreation of Terra's $18.7B implosion.
          </template>
          <template v-else-if="previousItem.endingReserveMeta.amountRemaining">
            This lever models Terra's attempt to use reserve funds to restabilize its token. However, it is only applied during the "collapse" phase.
          </template>
          <template v-else>
            This lever models Terra's attempt to use reserve funds to restabilize its token. However, at this point in the model, Terra's reserve capital has been completely emptied.
          </template>
        </p>

        <!-- ---------------------------------------------------- -->

        <p v-if="id === 'speculativeGreed'" class="space-y-2">
          Speculative demand responds to price gains from all sources. This interval's gain of
          {{ item.pctIncreaseFromAllSources.toFixed(4) }}% over {{ item.durationInHours }} hours
          corresponds to {{ (item.pctIncreaseFromAllSources * 365 * 24 / item.durationInHours).toFixed(2) }}% APR
          using simple annualization, without compounding.
          The model compares recent intervals' APR with the configured minimum of {{ rules.speculativeGreedLow }}% APR
          and maximum-growth threshold of {{ rules.speculativeGreedHigh }}% APR.
          Buying starts at {{ rules.speculativeStartingDailyInflow * 100 }}% of prior-day capital per day,
          then grows by up to {{ rules.speculativeMaxDailyGrowth * 100 }}% per day while returns qualify.
          Weak returns taper buying by {{ rules.speculativeDailyTaper * 100 }}% per day,
          stopping after {{ rules.speculativeWeakReturnStopHours }} consecutive weak hours.
          Capital inflows also depend on the recent-history requirements and available excess supply.
          You can configure these properties in your model's configuration settings.
        </p>

        <p v-if="id === 'certaintyGreed'" class="space-y-2">
          This capital increase is drive by the profit certainty that comes from taxation. It has little to do with speculation and is therefore a stable source of capital. So long as the 
          Ulixee Data Network continues to be used, a consistant quantity of tokens will be burned from circulation and therefore a consistent upward increase in price. Yesterday's taxation
          burn increased the Argon by {{ item.pctIncreaseFromTaxationCompoundedAnnually.toFixed(2) }}%, which is
          <template v-if="item.pctIncreaseFromTaxationCompoundedAnnually < rules.certaintyGreedLow">less than the configured minimum of {{rules.certaintyGreedLow}}% and therefore why no capital was added. </template>
          <template v-else>greater than the configured minimum of {{rules.certaintyGreedLow}}% and therefore why capital was added.</template>
          You can configure this property in your model's configuration settings.
        </p>

        <p v-if="id === 'terraCapitalIncrease'" class="space-y-2">
          This interval adds ${{formatShorthandNumber(usd(item.capitalAddedMap.TerraGrowth), 2)}} in modeled capital. SAM follows Terra's growth pattern, valued at the frozen Argon target.
        </p>
        
        <p v-if="id === 'terraCapitalDecrease'" class="space-y-2">
          SAM follows Terra's collapse pattern. Its modeled capital outflows are converted to dollars using the frozen Argon target; they are not historical USD observations.
        </p>

        <p v-if="id === 'supply'" class="space-y-2">
          Argons have
          <template v-if="item.endingCirculation > previousItem.endingCirculation">increased by ₳{{ formatShorthandNumber(item.endingCirculation - previousItem.endingCirculation) }} since yesterday. They are now at to ₳{{ formatShorthandNumber(item.endingCirculation) }}. </template>
          <template v-else-if="item.endingCirculation < previousItem.endingCirculation">decreased by ₳{{ formatShorthandNumber(previousItem.endingCirculation - item.endingCirculation) }} since yesterday. They are now at ₳{{ formatShorthandNumber(item.endingCirculation) }}. </template>
          <template v-else>remained steady since yesterday with ₳{{ formatShorthandNumber(item.endingCirculation, { mantissa: 2 }) }} in circulation. </template>

          <template v-if="item.endingCirculation === item.endingCapital">Supply is in balance with demand.</template>
          <template v-else-if="item.endingCirculation > item.endingCapital">It must be reduced by ₳{{ formatShorthandNumber(item.endingCirculation - item.endingCapital) }} to reach equilibrium with demand.</template>
        </p>

        <p v-if="id === 'demand'" class="space-y-2">
          Capital in the Argon has
          <template v-if="item.endingCapital > previousItem.endingCapital">increased by ${{ formatShorthandNumber(usd(item.endingCapital - previousItem.endingCapital)) }} to ${{ formatShorthandNumber(usd(item.endingCapital)) }} since yesterday.</template>
          <template v-else-if="item.endingCapital < previousItem.endingCapital">decreased by ${{ formatShorthandNumber(usd(previousItem.endingCapital - item.endingCapital)) }} to ${{ formatShorthandNumber(usd(item.endingCapital)) }} since yesterday.</template>
          <template v-else>remained steady since yesterday with ${{ formatShorthandNumber(usd(item.endingCapital), { mantissa: 2 }) }} in the market. </template>

          <template v-if="item.endingCapital === item.endingCirculation">Supply is in balance with demand.</template>
          <template v-else-if="item.endingCirculation - item.endingCapital > 1">It must be increased by ${{ formatShorthandNumber(usd(item.endingCirculation - item.endingCapital)) }} to reach equilibrium with supply.</template>
        </p>

        <!-- ---------------------------------------------------- -->

        <p v-if="id === 'collapseThenRecover'" class="space-y-2">
         This scenario applies the Terra-shaped shock before enabling the modeled stabilization mechanisms. Dollar amounts use the frozen Argon target.
        </p>

        <p v-if="id === 'collapsedForever'" class="space-y-2">
          This shows what happens when Argon's stabilization mechanism are completely disabled. Forever. It's basically the Terra collapse reenacted.
        </p>

        <p v-if="id === 'collapsingRecovery'" class="space-y-2">
          This scenario keeps the modeled stabilization mechanisms enabled throughout the Terra-shaped sequence of market shocks. Dollar amounts use the frozen Argon target.
        </p>
      </div>
    </div>            
  </div>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import { toUsd } from '../lib/ArgonTarget';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import emitter from '../emitters/basic';
import { addCommas, currency, formatAsBillions, formatPrice, formatShorthandNumber } from '../lib/BasicUtils';
import Marker from '../engine/Marker';
import { useBasicStore } from '../store';

dayjs.extend(dayjsUtc);

const basicStore = useBasicStore();
const usd = (value: number) => toUsd(value, basicStore.rules.usdTargetForArgon);
const { rules } = storeToRefs(basicStore);

const isOpen = Vue.ref(false);

const id = Vue.ref('');
const item = Vue.ref({} as any);
const previousItem = Vue.ref({} as any);

const positionAt = Vue.ref('');
const alignTo = Vue.ref('');

const left = Vue.ref('auto');
const top = Vue.ref('auto');
const translateY = Vue.ref('0');
const translateX = Vue.ref('0');

const width = Vue.ref('auto');

const arrowLeft = Vue.ref('auto');
const arrowRight = Vue.ref('auto');
const arrowTop = Vue.ref('auto');
const arrowBottom = Vue.ref('auto');
const arrowTranslateX = Vue.ref('-50%');

const textAlign = Vue.ref('left');

emitter.on('showInsight', (incoming: any) => {
  isOpen.value = true;
  id.value = incoming.id;
  positionAt.value = incoming.positionAt;
  alignTo.value = incoming.alignTo;
  width.value = incoming.width ? `${incoming.width}px` : '24rem';
  item.value = incoming.item;
  previousItem.value = incoming.previousItem;
  arrowTranslateX.value = '-50%';

  if (positionAt.value === 'top') {
    top.value = `${incoming.y - 5}px`;
    arrowTop.value = 'auto';
    arrowBottom.value = '0px';
    translateY.value = '-100%';
  } 

  if (positionAt.value === 'bottom') {
    top.value = `${incoming.y + 13}px`;
    arrowTop.value = '0px';
    arrowBottom.value = 'auto';
    translateY.value = '0';
  }

  left.value = `${incoming.x}px`;
  arrowLeft.value = `${incoming.arrowX}px`;
  arrowRight.value = 'auto';
  textAlign.value = 'left';
  
  if (alignTo.value === 'left') {
    translateX.value = '0';
  } else if (alignTo.value === 'right') {
    translateX.value = '-100%';
    arrowRight.value = arrowLeft.value;
    arrowLeft.value = 'auto';
    arrowTranslateX.value = '50%';
  } else if (alignTo.value === 'center') {
    arrowLeft.value = '50%'
    translateX.value = '-50%';
    textAlign.value = 'center';
  }
});

emitter.on('hideInsight', () => {
  isOpen.value = false;
});
</script>
