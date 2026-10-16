<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog ref="dialogRef" class="Player Component relative z-[100]">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full p-3">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="flex flex-col border border-slate-500 rounded bg-[#f8f9fc] px-2 pb-4 pt-3 text-left shadow-xl shadow-slate-900/30 transition-all w-full select-none overflow-scroll">
              
              <div ref="scoreboardRef" class="flex flex-row mx-1 items-stretch space-x-2 text-slate-500 font-light">
                
                <div class="relative w-1/4 flex flex-col items-center space-x-1 border border-t-0 border-slate-300/90 rounded-b pb-1 pt-1 px-0.5">
                  <h4 :class="{'opacity-60': graphIsOpen }" class="font-bold py-2 opacity-80">Bitcoin Tokens</h4>
                  <div class="flex flex-row space-x-1 divide-x divide-slate-300/80 text-center w-full text-slate-500">
                    
                    <div :class="{'opacity-30': graphIsOpen, 'bg-green-100': item.step.burnCoverage > getPreviousItem(item).step.burnCoverage, 'bg-red-100': item.step.burnCoverage < getPreviousItem(item).step.burnCoverage}" class="relative w-1/2 pb-2 cursor-pointer hover:text-fuchsia-800" insightId="bitcoinCoverage" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      ₳{{ formatAsBillions(item.step.burnCoverage) }}
                      <div>Burn Coverage</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                    
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-fuchsia-800" insightId="bitcoinProfits" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      ${{ formatAsBillions(item.endingVaultMeta.profitsToDate) }}
                      <div>Vaulting Profits</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>

                  </div>
                </div>

                <div class="relative w-1/4 flex flex-col items-center space-x-1 border border-t-0 border-slate-300/90 rounded-b pb-1 pt-1 px-0.5">
                  <h4 :class="{'opacity-60': graphIsOpen }" class="font-bold py-2 opacity-80">Argon Tokens</h4>
                  <div class="flex flex-row space-x-1 divide-x divide-slate-300/80 text-center w-full text-slate-500">
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-lime-700" insightId="argonRelativeToDollar" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      {{ item.step.dollarDiffPct > 0 ? '+' : '' }}{{ item.step.dollarDiffPct }}%
                      <div>Relative Purchasing Power</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-red-700" insightId="argonLosses" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      ${{ formatAsBillions(usd(item.argonLossDueToFear)) }}
                      <div>Losses Due to Fear</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                  </div>
                </div>

                <div class="relative w-1/4 flex flex-col items-center space-x-1 border border-t-0 border-slate-300/90 rounded-b pb-1 pt-1 px-0.5">
                  <h4 :class="{'opacity-60': graphIsOpen }" class="font-bold py-2 opacity-80">Miners & Argonot Tokens</h4>
                  <div class="flex flex-row space-x-1 divide-x divide-slate-300/80 text-center w-full text-slate-500">
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-lime-700" insightId="seigniorageProfits" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      ${{ formatAsBillions(usd(item.seigniorageProfits)) }}
                      <div>Seigniorage Profits</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-red-700" insightId="seigniorageLosses" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      $0
                      <div>Seigniorage Losses</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                  </div>
                </div>

                <div class="w-1/4 relative flex flex-col items-center space-x-1 border border-t-0 border-slate-300/90 rounded-b pb-1 pt-1 px-0.5">
                  <h4 :class="{'opacity-60': graphIsOpen }" class="font-bold py-2 opacity-80">Sidechain Usage</h4>
                  <div class="flex flex-row space-x-1 divide-x divide-slate-300/80 text-center w-full text-slate-500">
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-blue-700" insightId="annualTransactions" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      {{ formatAsBillions(item.annualTransactions) }}
                      <div>Sidechain Txns</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                    <div :class="{'opacity-30': graphIsOpen }" class="relative w-1/2 pb-2 cursor-pointer hover:text-blue-700" insightId="annualMicropayments" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="grandparent">
                      ₳{{ formatAsBillions(Marker.calculateWageProtectedPrice(item.annualMicropayments, item.lowestPrice)) }}
                      <div>Micropayments ARR</div>
                      <div VerticalLineWithTopFade class="absolute bottom-[-37px] left-1/2 h-7 -translate-x-1/2"></div>
                    </div>
                  </div>
                </div>

                <div @click="closePlayer()" CloseIcon class="absolute top-2 right-2 cursor-pointer flex flex-row items-center space-x-1 border border-slate-400/70 rounded-full p-2 bg-white hover:bg-slate-300">
                  <CloseIcon class="inline-block w-3 h-3" />
                </div>

              </div>
              <div HorizontalLine Light class="relative left-[6.7%] w-[86.9%] mt-8 -top-1"></div>
              <DialogTitle class="whitespace-nowrap text-xl font-light text-center pt-12 px-3 relative text-slate-600">
                <div VerticalLine Light class="ArrowBottom absolute -top-1 left-1/2 h-10 -translate-x-1/2"></div>
                {{ dayjs.utc(item.startingDate).format('MMMM D, YYYY') }}
              </DialogTitle>

              <div class="flex flex-col h-full">
                <div class="text-center items-center text-4xl font-bold text-slate-600 mt-1 relative pt-0 pb-3">
                  <span insightId="price" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="center" class="relative">
                    ${{formatPrice(usd(step.currentPrice), 3)}} <span class="opacity-90 font-light">&nbsp;for&nbsp;</span> ₳1.00
                    <div class="absolute bottom-0 -right-2 translate-x-full">
                      <span v-if="priceChangePct" class="text-xl font-semibold relative top-[-0.42rem]">
                        <span :class="priceChangePct > 0 ? 'text-green-600' : 'text-red-500'">{{ priceChangePct > 0 ? '+' : '' }}{{ addCommas(priceChangePct) }}%</span>
                      </span>
                    </div>
                  </span>
                </div>
                <div class="grow h-full flex flex-row items-stretch justify-center pt-12 pb-16 text-center relative">
                  <div VerticalLine class="ArrowTop absolute top-0 left-1/2 h-12"></div>

                  <div class="grow relative">
                    <div class="absolute top-20 right-14 bottom-0 flex flex-col z-40 justify-around">

                      <div class="relative group text-sm flex flex-row">
                        <div insightId="bitcoinUnlocking" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" class="absolute z-10 hidden group-hover:block -top-3 -left-3 border-[1.5px] border-r-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div class="flex-1 text-right pr-2 leading-5 opacity-20">Burning From<br />Bitcoin Unlocking</div>
                        <div class="w-28 flex items-center rounded-sm border border-fuchsia-800/10 justify-center text-lg font-semibold text-slate-300">
                          ₳0
                          <AlertIcon v-if="item.endingPrice < 1.00 && !item.circulationRemovedMap.BitcoinFusion && item.endingVaultMeta.bitcoinCount" class="text-red-400/50 inline-block w-5 h-5 ml-1.5" />
                        </div>
                        <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="formatAsBillions(item.circulationRemovedMap.BitcoinFusion || 0) !== '0'" class="absolute top-0 right-0 w-full h-full flex flex-row">
                          <div class="flex-1 text-right pr-2 leading-5 text-slate-400">Burning From<br />Bitcoin Unlocking</div>
                          <div class="bg-[#9765a8] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">- ₳{{formatAsBillions(item.circulationRemovedMap.BitcoinFusion || 0)}}</div>
                          <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                      <div class="relative group text-sm flex flex-row">
                        <div insightId="taxedMicropayments" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" class="absolute z-10 hidden group-hover:block -top-3 -left-3 border-[1.5px] border-r-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div class="flex-1 text-right pr-2 leading-5 opacity-20">Burning From<br />Micropayment Taxes</div>
                        <div class="w-28 flex items-center rounded-sm border border-fuchsia-800/10 justify-center text-lg font-semibold text-slate-300">
                          ₳0
                          <AlertIcon v-if="item.endingPrice < 1.00 && !item.circulationRemovedMap.MicropaymentTaxes" class="text-red-400/50 inline-block w-5 h-5 ml-1.5" />
                        </div>
                        <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="formatAsBillions(item.circulationRemovedMap.MicropaymentTaxes || 0) !== '0'" class="absolute top-0 right-0 w-full h-full flex flex-row">
                          <div class="flex-1 text-right pr-2 leading-5 text-slate-400">Burning From<br />Micropayment Taxes</div>
                          <div class="bg-[#9765a8] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">- ₳{{formatAsBillions(item.circulationRemovedMap.MicropaymentTaxes || 0)}}</div>
                          <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                      <div class="relative group text-sm flex flex-row">
                        <div insightId="taxedTransactions" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" class="absolute z-10 hidden group-hover:block -top-3 -left-3 border-[1.5px] border-r-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div class="flex-1 text-right pr-2 leading-5 opacity-20">Burning From<br />Peer-to-Peer Taxes</div>
                        <div class="w-28 flex items-center rounded-sm border border-fuchsia-800/10 justify-center text-lg font-semibold text-slate-300">
                          ₳0
                          <AlertIcon v-if="item.endingPrice < 1.00 && formatAsBillions(item.circulationRemovedMap.TransactionalTaxes || 0) === '0'" class="text-red-400/50 inline-block w-5 h-5 ml-1.5" />
                        </div>
                        <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="formatAsBillions(item.circulationRemovedMap.TransactionalTaxes || 0) !== '0'" class="absolute top-0 right-0 w-full h-full flex flex-row">
                          <div class="flex-1 text-right pr-2 leading-5 text-slate-400">Burning From<br />Peer-to-Peer Taxes</div>
                          <div class="bg-[#9765a8] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">- ₳{{formatAsBillions(item.circulationRemovedMap.TransactionalTaxes || 0)}}</div>
                          <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                      <div class="relative group text-sm flex flex-row">
                        <div :insightId="formatAsBillions(item.circulationAddedMap.TerraGrowth || 0) !== '0' ? 'terraCirculationIncrease' : 'terraCirculationDecrease'" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" class="absolute z-10 hidden group-hover:block -top-3 -left-3 border-[1.5px] border-r-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div v-if="formatAsBillions(item.circulationAddedMap.TerraGrowth || 0) !== '0'" class="flex-1 text-right pr-2 leading-5 opacity-20">Inflow From Terra's<br />Rising Popularity</div>
                        <div v-else class="flex-1 text-right pr-2 leading-5 opacity-20">Burning From Terra's<br />Stabilization Reserve</div>
                        <div class="w-28 flex items-center rounded-sm border border-fuchsia-800/10 justify-center text-lg font-semibold text-slate-300">₳0</div>
                        <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="formatAsBillions(item.circulationAddedMap.TerraGrowth || 0) !== '0'" class="absolute top-0 right-0 w-full h-full flex flex-row">
                          <div class="flex-1 text-right pr-2 leading-5 text-slate-400">Inflow From Terra's<br />Rising Popularity</div>
                          <div class="bg-[#9765a8] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">+ ₳{{formatAsBillions(item.circulationAddedMap.TerraGrowth || 0)}}</div>
                          <div HorizontalLine class="ArrowRight w-10 absolute top-1/2 -right-1 translate-x-full -translate-y-1/2"></div>
                        </div>
                        <div v-else-if="formatAsBillions(item.circulationRemovedMap.ReserveSpend || 0) !== '0'" class="absolute top-0 right-0 w-full h-full flex flex-row">
                          <div class="flex-1 text-right pr-2 leading-5 text-slate-400">Burning From Terra's<br />Stabilization Reserve</div>
                          <div class="bg-[#9765a8] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">- ₳{{formatAsBillions(item.circulationRemovedMap.ReserveSpend || 0)}}</div>
                          <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -right-3 translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                    </div>
                  </div>
                  <div class="w-1/4 flex flex-col relative">
                    <div HorizontalLine class="w-1/2 absolute top-0 left-1/2"></div>
                    <div VerticalLineWithBottomFade class="relative left-1/2 h-16"></div>
                    <SlotMachine id="supply" bgColor="#9765a8" :yesterday="getPreviousItem(item).endingCirculation" :today="item.endingCirculation" :tomorrow="getNextItem(item).endingCirculation" :pct="supplyPct" insightId="supply" @mouseenter="showInsight" @mouseleave="hideInsight" position="bottom" align="center"class="w-full grow" />
                  </div>
                  <div class="relative h-full">
                    <div HorizontalLine class="w-full absolute top-0 left-0"></div>
                    <div insightId="unbalanced" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" align="center" class="absolute top-3 left-1/2 -translate-x-1/2 text-center text-sm text-slate-400/80 uppercase whitespace-nowrap z-1">
                      <span v-if="formatAsBillions(item.endingCapital) === formatAsBillions(item.endingCirculation)">Both sides are in balance</span>
                      <span v-else-if="item.endingCapital > item.endingCirculation">Demand exceeds supply by ₳{{ formatAsBillions(item.endingCapital - item.endingCirculation) }} at target</span>
                      <span v-else>Supply exceeds demand by ₳{{ formatAsBillions(item.endingCirculation - item.endingCapital) }} at target</span>
                    </div>
                    <div yAxis title="Scale in ARGN equivalents at target; demand amounts are displayed in USD" class="flex flex-col px-2 justify-between h-full space-y-4 text-center pt-20">
                      <div class="mx-3"><span>{{formatAsBillions(maxSupplyDemand)}}</span></div>
                      <div class="mx-3"><span>{{formatAsBillions(maxSupplyDemand * 0.8)}}</span></div>
                      <div class="mx-3"><span>{{formatAsBillions(maxSupplyDemand * 0.6)}}</span></div>
                      <div class="mx-3"><span>{{formatAsBillions(maxSupplyDemand * 0.4)}}</span></div>
                      <div class="mx-3"><span>{{formatAsBillions(maxSupplyDemand * 0.2)}}</span></div>
                      <div class="mx-6"><span>0</span></div>
                    </div>
                  </div>
                  <div class="w-1/4 flex flex-col relative">
                    <div HorizontalLine class="w-1/2 absolute top-0 right-1/2"></div>
                    <div VerticalLineWithBottomFade class="relative left-1/2 h-16"></div>
                    <SlotMachine id="demand" bgColor="#668ACD" :yesterday="usd(getPreviousItem(item).endingCapital)" :today="usd(item.endingCapital)" :tomorrow="usd(getNextItem(item).endingCapital)" :pct="demandPct" insightId="demand" @mouseenter="showInsight" @mouseleave="hideInsight" position="bottom" align="center" class="w-full grow" />
                  </div>
                  <div class="grow relative">
                    <div class="absolute top-20 bottom-0 left-14 flex flex-col z-40 justify-around">
                      
                      <div class="relative group text-sm flex flex-row">
                        <div insightId="speculativeGreed" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" align="right" class="absolute z-10 hidden group-hover:block -top-3 -right-3 border-[1.5px] border-l-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div class="w-28 flex items-center rounded-sm border border-sky-900/10 justify-center text-lg font-semibold text-slate-300">$0</div>
                        <div class="flex-1 text-left pl-2 leading-5 opacity-20">Inflow From<br />Profit Speculators</div>
                        <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -left-1 -translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="item.capitalAddedMap.SpeculativeGreed" class="absolute top-0 left-0 w-full h-full text-sm flex flex-row">
                          <div class="flex-1 text-left pr-2 leading-5 text-slate-400">From Profit<br />Speculators</div>
                          <div class="bg-[#668ACD] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">+ ${{ formatAsBillions(usd(item.capitalAddedMap.SpeculativeGreed || 0)) }}</div>
                          <div HorizontalLine class="ArrowRight w-10 absolute top-1/2 -right-1 translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                      <div class="relative group text-sm flex flex-row">
                        <div insightId="certaintyGreed" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" align="right" class="absolute z-10 hidden group-hover:block -top-3 -right-3 border-[1.5px] border-l-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div class="w-28 flex items-center rounded-sm border border-sky-900/10 justify-center text-lg font-semibold text-slate-300">$0</div>
                        <div class="flex-1 text-left pl-2 leading-5 opacity-20">Inflow From<br />Profit Certainty</div>
                        <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -left-1 -translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="item.capitalAddedMap.CertaintyGreed" class="absolute top-0 left-0 w-full h-full text-sm flex flex-row">
                          <div class="bg-[#668ACD] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">+ ${{ formatAsBillions(usd(item.capitalAddedMap.CertaintyGreed || 0)) }}</div>
                          <div class="flex-1 text-left pl-2 leading-5 text-slate-400">Inflow From<br />Profit Certainty</div>
                          <div HorizontalLine class="ArrowLeft w-10 absolute top-1/2 -left-1 -translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                      <div class="relative group text-sm flex flex-row">
                        <div :insightId="item.capitalRemovedMap.TerraCollapse ? 'terraCapitalDecrease' : 'terraCapitalIncrease'" @mouseenter="showInsight" @mouseleave="hideInsight" @click="toggleGraphView" position="top" align="right" class="absolute z-10 hidden group-hover:block -top-3 -right-3 border-[1.5px] border-l-0 border-dashed border-slate-400/50" style="width: calc(100% + 60px); height: calc(100% + 24px)"></div>
                        <div class="w-28 flex items-center rounded-sm border border-sky-900/10 justify-center text-lg font-semibold text-slate-300">
                          <span v-if="item.capitalRemovedMap.TerraCollapse">-</span><span v-else-if="item.capitalAddedMap.TerraGrowth">+</span> ${{formatAsBillions(usd(item.capitalRemovedMap.TerraCollapse || item.capitalAddedMap.TerraGrowth || 0))}}
                        </div>
                        <div v-if="item.capitalRemovedMap.TerraCollapse" class="flex-1 text-left pl-2 leading-5 opacity-20">Outflow From Modeled<br />Terra-Shaped Collapse</div>
                        <div v-else class="flex-1 text-left pl-2 leading-5 opacity-20">Inflow From Terra's<br />Rising Popularity</div>
                        <div HorizontalLine class="ArrowRight w-10 absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2 opacity-20"></div>
                        <div v-if="item.capitalRemovedMap.TerraCollapse || item.capitalAddedMap.TerraGrowth" class="absolute top-0 left-0 w-full h-full text-sm flex flex-row">
                          <div class="bg-[#668ACD] w-28 flex items-center justify-center text-lg text-white font-semibold shadow">
                            <span v-if="item.capitalRemovedMap.TerraCollapse">-&nbsp;</span><span v-else-if="item.capitalAddedMap.TerraGrowth">+&nbsp;</span> ${{formatAsBillions(usd(item.capitalRemovedMap.TerraCollapse || item.capitalAddedMap.TerraGrowth || 0))}}
                          </div>
                          <div v-if="item.capitalRemovedMap.TerraCollapse" class="flex-1 text-left pl-2 leading-5 text-slate-400">Outflow From Modeled<br />Terra-Shaped Collapse</div>
                          <div v-else class="flex-1 text-left pl-2 leading-5 text-slate-400">Inflow From Terra's<br />Rising Popularity</div>
                          <div HorizontalLine v-if="item.capitalRemovedMap.TerraCollapse" class="ArrowRight w-10 absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2"></div>
                          <div HorizontalLine v-else-if="item.capitalAddedMap.TerraGrowth" class="ArrowLeft w-10 absolute top-1/2 -left-1 -translate-x-full -translate-y-1/2"></div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                <div class="flex flex-col px-2">
                  <div @mouseenter="showPlayerNibShadow" @mouseleave="hidePlayerNibShadow" @mousemove="updatePlayerNibShadow" ref="playerBarRef" class="relative h-16 flex flex-row items-center">
                    <div MinichartContainer class="relative h-16 w-full flex">
                      <div MinichartBg />
                      <Minichart :items="itemsActive" @click="onMinichartClick" />
                    </div>
                    <div v-if="!dragMeta.isDragging" :style="`left: ${playerNibShadow.left}px; transform: translateX(-5px); opacity: ${playerNibShadow.opacity}`" class="absolute transition-[left] bg-white rounded-full -top-1 -bottom-1 w-2 border z-10 border-slate-400 shadow pointer-events-none"></div>
                    <div @mousedown="startDrag" :style="`cursor: ${sliderCursor}; left: ${playerNib.left}%; transform: translateX(-${playerNib.left}%);`" class="absolute transition-[left] bg-white rounded-full -top-1 -bottom-1 w-2 border z-10 border-slate-400 shadow"></div>
                  </div>
                  <div class="flex flex-row items-center pt-3">
                    <div class="flex flex-row space-x-2">
                      <PauseButtonIcon PlayerIcon v-if="isPlaying" @click="pause" class="h-5 mr-[2.5px]" />
                      <PlayButtonIcon PlayerIcon v-else @click="play" class="h-5" />
                      <StepBackwardIcon PlayerIcon @click="selectPreviousStep" class="h-5" />
                      <StepForwardIcon PlayerIcon @click="selectNextStep" class="h-5" />
                    </div>
                    <div class="text-sm grow text-center opacity-40">Replaying {{ dayjs.utc(firstItem.startingDate).format('MMMM D, YYYY') }} through {{ dayjs.utc(lastItem.startingDate).format('MMMM D, YYYY') }}</div>
                    <div class="flex flex-row space-x-2">
                      <DownloadIcon class="h-5 mr-0.5" />
                    </div>
                  </div>
                </div>
              </div>
              <GraphView :items="itemsActive" />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import * as Vue from 'vue';
import { useBasicStore } from '../store';
import { toUsd } from '../lib/ArgonTarget';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import emitter from '../emitters/basic';
import { formatAsBillions, formatPrice } from '../lib/BasicUtils';
import PlayButtonIcon from '../assets/play-button.svg';
import PauseButtonIcon from '../assets/pause-button.svg';
import StepForwardIcon from '../assets/step-forward.svg';
import StepBackwardIcon from '../assets/step-backward.svg';
import DownloadIcon from '../assets/download-outlined.svg';
import CloseIcon from '../assets/close.svg';
import { formatChangePct, addCommas } from '../lib/BasicUtils';
import Minichart from '../components/Minichart.vue';
import SlotMachine from '../components/SlotMachine.vue';
import GraphView from './GraphView.vue';
import Marker from '../engine/Marker';
import AlertIcon from '../assets/alert.svg';
import * as InsightUtils from '../lib/InsightUtils';

dayjs.extend(dayjsUtc);

const basicStore = useBasicStore();
const usd = (value: number) => toUsd(value, basicStore.rules.usdTargetForArgon);

const isOpen = Vue.ref(false);
const dialogRef = Vue.ref<HTMLDialogElement | null>(null);
const scoreboardRef = Vue.ref<HTMLDivElement | null>(null);

const items: Vue.Ref<any[]> = Vue.ref([]);
const itemsActive: Vue.Ref<any[]> = Vue.ref([]);
const firstIdx: Vue.Ref<number> = Vue.ref(0);
const lastIdx: Vue.Ref<number> = Vue.ref(0);

const firstItem: Vue.Ref<any> = Vue.ref({});
const lastItem: Vue.Ref<any> = Vue.ref({});
const item: Vue.Ref<any> = Vue.ref({});
const currentIdx: Vue.Ref<number | null> = Vue.ref(null);
const step: Vue.Ref<any> = Vue.ref({});

const maxSupplyDemand = Vue.ref(0);

const supplyPct: Vue.Ref<number> = Vue.ref(0);
const demandPct: Vue.Ref<number> = Vue.ref(0);

const priceChangePct: Vue.Ref<number> = Vue.ref(0);
const isPlaying: Vue.Ref<boolean> = Vue.ref(false);

const playerNibShadow: Vue.Ref<{ left: number, opacity: number }> = Vue.ref({ left: 0, opacity: 0 });

const graphIsOpen = Vue.ref('');

function showPlayerNibShadow(event: MouseEvent) {
  if (!playerBarRef.value) return;

  const rect = playerBarRef.value.getBoundingClientRect();
  const left = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
  playerNibShadow.value = { left: left, opacity: 0.5 };
}

function hidePlayerNibShadow() {
  playerNibShadow.value.opacity = 0;
}

let isThrottled = false;

function throttledUpdatePlayerNibShadow(event: MouseEvent) {
  if (isThrottled || !playerBarRef.value) return;
  isThrottled = true;
  
  const rect = playerBarRef.value.getBoundingClientRect();
  const left = Math.min(Math.max(5, event.clientX - rect.left), rect.width);
  playerNibShadow.value = { left: left, opacity: 0.5 };
  isThrottled = false;
}

function updatePlayerNibShadow(event: MouseEvent) {
  throttledUpdatePlayerNibShadow(event);
}

function showInsight(event: MouseEvent) {
  if (graphIsOpen.value) return;

  const targetElem = event.currentTarget as HTMLElement;
  if (!targetElem) return;

  const id = targetElem.getAttribute('insightId') || '';
  const data = { item: item.value, previousItem: getPreviousItem(item.value) };
  const options: any = {};
  
  if (['supply', 'demand'].includes(id)) {
    options.shiftY = -80;
  }

  InsightUtils.showInsight(event, data, options);
}

function hideInsight() {
  InsightUtils.hideInsight();
}

function toggleGraphView(event: MouseEvent) {
  const targetElem = event.currentTarget as HTMLElement;
  if (!targetElem) return;

  const id = targetElem.getAttribute('insightId') || '';
  const targetRect = targetElem.getBoundingClientRect();

  if (graphIsOpen.value === id) {
    graphIsOpen.value = '';
    emitter.emit('hideGraphView');
    showInsight(event);
    return;
  } else if (graphIsOpen.value) {
    emitter.emit('hideGraphView');
  }

  const grandparentElem = targetElem.parentElement?.parentElement?.parentElement;
  if (!grandparentElem) return;

  const scoreboardRect = scoreboardRef.value?.getBoundingClientRect();
  const grandparentRect = grandparentElem.getBoundingClientRect();

  const padding = scoreboardRect?.left;

  const arrowLeft = (targetRect.left - grandparentRect.left) + (targetRect.width / 2);
  const top = targetRect.top + targetRect.height;
  const width = targetRect.width;

  emitter.emit('showGraphView', { id, padding, arrowLeft, top, width });
  graphIsOpen.value = id;
  hideInsight();
}

emitter.on('graphViewHidden', () => {
  graphIsOpen.value = '';
});

function onMinichartClick(event: any) {
  if (!playerBarRef.value) return;

  const rect = playerBarRef.value.getBoundingClientRect();
  const offsetX = event.x; - rect.left;
  const width = rect.width;
  const newPosPct = Math.min(Math.max(0, offsetX / width) * 100, 100);
  const totalTicks = itemsActive.value.length - 1;
  const selectedIdx = Math.round(totalTicks * (newPosPct / 100));

  itemsToSelect.push({ idx: selectedIdx });
  processItemsToSelect();
}

function isZero(num: number, decimals: number = 3) {
  if (!num) return 0;

  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function selectPreviousStep() {
  if (!itemsActive.value.length) return;
  
  if (currentIdx.value === null) {
    currentIdx.value = 0;
  } else {
    currentIdx.value = Math.max(currentIdx.value - 1, 0);
  }

  selectItem(currentIdx.value);
}

function selectNextStep() {
  if (!itemsActive.value.length) return;

  if (currentIdx.value === null) {
    currentIdx.value = 0;
  } else {
    currentIdx.value = currentIdx.value + 1;

    const maxIdx = itemsActive.value.length - 1;
    if (currentIdx.value >= maxIdx) {
      currentIdx.value = maxIdx;
      isPlaying.value = false;
    }
  }

  selectItem(currentIdx.value);
  if (isPlaying.value) {
    setTimeout(selectNextStep, 100);
  }
}

function selectItem(idx: number) {
  currentIdx.value = idx;
  item.value = itemsActive.value[currentIdx.value];
  supplyPct.value = item.value.endingCirculation / maxSupplyDemand.value;
  demandPct.value = item.value.endingCapital / maxSupplyDemand.value;
  priceChangePct.value = formatChangePct((item.value.endingPrice - item.value.startingPrice) / item.value.startingPrice);

  playerNib.value.left = (currentIdx.value / itemsActive.value.length) * 100;
  item.value.step ??= createStep(item.value);
  step.value = item.value.step;
}

const playerBarRef = Vue.ref<HTMLDivElement | null>(null);
const playerNib: Vue.Ref<{ left: number }> = Vue.ref({ left: 0 });
const sliderCursor: Vue.Ref<string> = Vue.ref('grab');
const dragMeta: Vue.Ref<any> = Vue.ref({ isDragging: false });
const itemsToSelect: any[] = [];

function play() {
  isPlaying.value = true;
  const maxIdx = itemsActive.value.length - 1;
  if (currentIdx.value === maxIdx) {
    currentIdx.value = null;
  }
  selectNextStep();
}

function pause() {
  isPlaying.value = false;
}

function startDrag(event: MouseEvent) {
  dragMeta.value.startX = event.clientX;
  dragMeta.value.isDragging = true;

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  sliderCursor.value = 'grabbing';
  document.body.style.cursor = 'grabbing';
}

let onDragTimeout: any = null;
function onDrag(event: MouseEvent) {
  if (!playerBarRef.value) return;

  clearTimeout(onDragTimeout);
  const rect = playerBarRef.value.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const width = rect.width;
  const newPosPct = Math.min(Math.max(0, offsetX / width) * 100, 100);
  const totalTicks = itemsActive.value.length - 1;
  const selectedIdx = Math.round(totalTicks * (newPosPct / 100));
  
  itemsToSelect.push({ idx: selectedIdx });
  onDragTimeout = setTimeout(() => {
    processItemsToSelect();
  }, 1);
}

function processItemsToSelect() {
  if (!itemsToSelect.length) return;

  const itemToSelect = itemsToSelect.pop();
  itemsToSelect.splice(0, itemsToSelect.length);
  selectItem(itemToSelect.idx);
}

function stopDrag() {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  dragMeta.value.isDragging = false;
  sliderCursor.value = 'grab';
  document.body.style.cursor = '';
}

function closePlayer() {
  isOpen.value = false;
  hideInsight();
}

function handleKeyPress(e: KeyboardEvent) {
  if (!isOpen.value) return;
  if (e.key === 'Escape') {
    closePlayer();
  } else if (e.key === 'ArrowRight') {
    selectNextStep();
  } else if (e.key === 'ArrowLeft') {
    selectPreviousStep(); 
  }
}

emitter.on('openPlayer', (payload: any) => {
  isOpen.value = true;
  items.value = payload.items;
  currentIdx.value = payload.firstIdx;
  firstIdx.value = payload.firstIdx;
  lastIdx.value = payload.lastIdx;
  firstItem.value = items.value[firstIdx.value];
  lastItem.value = items.value[lastIdx.value];
  itemsActive.value = items.value.slice(firstIdx.value, lastIdx.value + 1);
  maxSupplyDemand.value = 0;

  for (const item of itemsActive.value) {
    maxSupplyDemand.value = Math.max(maxSupplyDemand.value, item.startingCirculation, item.endingCirculation, item.startingCapital, item.endingCapital);
  }

  selectItem(0);
});

function getNextItem(item: any) {
  const nextIdx = Math.min(item.nextIdx, lastIdx.value);
  const nextItem = items.value[nextIdx] || item;
  nextItem.step ??= createStep(nextItem);
  return nextItem;
}

function getPreviousItem(item: any) {
  const previousIdx = Math.max(item.previousIdx, firstIdx.value);
  const previousItem = items.value[previousIdx] || item;
  previousItem.step ??= createStep(previousItem);
  return previousItem;
}

function createStep(item: any) {
  const dollarDiffPct = formatChangePct((item.endingPrice - item.dollar.endingPrice) / item.dollar.endingPrice);
  const burnCoverage = item.endingVaultMeta.argonBurnCapacity;
  
  return {
      burnCoverage: burnCoverage,
      bitcoinsVaulted: Math.max(0, item.endingVaultMeta.bitcoinCount - item.startingVaultMeta.bitcoinCount),
      bitcoinsUnlocked: Math.max(0, item.startingVaultMeta.bitcoinCount - item.endingVaultMeta.bitcoinCount),
      currentCirculation: item.endingCirculation,
      currentPrice: item.endingCapital / item.endingCirculation,
      dollarDiffPct: dollarDiffPct,
    }
}

Vue.onBeforeMount(() => {
  document.addEventListener('keydown', handleKeyPress);
});

Vue.onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress);
});
</script>

<style lang="scss">
.Player.Component {
  [CloseIcon]:hover {
    opacity: 1;
    svg path {
      opacity: 1;
      fill: white;
      stroke: white;
    }
  }

  [PlayerIcon] {
    @apply cursor-pointer;
    path {
      fill: #64748b;
    }
    &:hover path {
      fill: #a21caf;
    }
  }

  [PriceFaded] {
    opacity: 0.5;
    background: -webkit-linear-gradient(#f8f9fc 0%, #f8f9fc 20%, rgb(71, 85, 105) 70%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  [MinichartBg] {
    @apply border-t border-b border-slate-400 bg-[#eef0f4] shadow-inner;
    position: absolute;
    left: -1rem;
    right: -1rem;
    top: 0;
    height: 100%;
    &:before {
      content: '';
      display: block;
      position: absolute;
      left: 0;
      width: 3rem;
      top: -1px;
      height: calc(100% + 2px);
      background: linear-gradient(to right, rgb(248, 249, 252) 0%, rgba(248, 249, 252, 0) 100%);
      pointer-events: none;
      z-index: 10;
    }
    &:after {
      content: '';
      display: block;
      position: absolute;
      right: 0;
      width: 3rem;
      top: -1px;
      height: calc(100% + 2px);
      background: linear-gradient(to left, rgb(248, 249, 252) 0%, rgba(248, 249, 252, 0) 100%);
      pointer-events: none;
      z-index: 10;
    }
  }

  [yAxis] {
    position: relative;
    top: -10px;
    height: calc(100% + 20px);
    & > div {
      @apply relative px-4;
      &:before {
        content: '';
        display: block;
        position: absolute;
        height: 1px;
        width: 100%;
        top: 50%;
        left: 0;
        background-color: rgba(205, 205, 205, 0.5);
        z-index: 0;
      }
      span {
        @apply inline-block px-2 text-slate-400;
        background: #f8f9fc;
        position: relative;
        z-index: 10;
      }
    }
  }

  [VerticalLineWithBottomFade] {
    background: linear-gradient(to top, rgba(168, 181, 200, 0) 0%, rgb(168, 181, 200) 50%);
    width: 6px;
  }

  [VerticalLineWithTopFade] {
    background: linear-gradient(to bottom, rgba(168, 181, 200, 0) 0%, rgb(210, 218, 229) 50%);
    width: 6px;
  }

  [HorizontalLine] {
    background: rgb(168, 181, 200);
    height: 6px;
    &[Light] {
      background: rgb(210, 218, 229);
    }
  }

  [HorizontalLine].ArrowRight:after {
    position: absolute;
    content: '';
    transform: translate(100%, -50%);
    top: 50%;
    right: 0;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-left: 8px solid rgb(168, 181, 200);
  }

  [HorizontalLine].ArrowLeft:after {
    position: absolute;
    content: '';
    transform: translate(-100%, -50%);
    top: 50%;
    left: 0;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-right: 8px solid rgb(168, 181, 200);
  }

  [VerticalLine] {
    background: rgb(168, 181, 200);
    width: 6px;
    &[Light] {
      background: rgb(210, 218, 229);
    }
  }

  [VerticalLine].ArrowTop:after {
    position: absolute;
    content: '';
    top: -3px;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 8px solid rgb(168, 181, 200);
  }

  [VerticalLine].ArrowBottom:after {
    position: absolute;
    content: '';
    bottom: -3px;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 8px solid rgb(210, 218, 229);
  }
}
</style>
