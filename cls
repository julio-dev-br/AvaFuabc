[35msrc/app/features/admin-dashboard/admin-dashboard.component.html[m[36m:[m[32m434[m[36m:[m            <input matInput [(ngModel)]="[1;31mquiz[mTitulo" placeholder="Ex: Avaliação de Retenção de Conhecimento - NR-32">
[35msrc/app/features/admin-dashboard/admin-dashboard.component.html[m[36m:[m[32m439[m[36m:[m            <input matInput type="number" [(ngModel)]="[1;31mquiz[mNotaMinima" min="0" max="10">
[35msrc/app/features/admin-dashboard/admin-dashboard.component.html[m[36m:[m[32m509[m[36m:[m            [disabled]="perguntasQuiz.length === 0 || ![1;31mquiz[mTitulo.trim()" (click)="salvarQuizCompleto()">
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m7[m[36m:[mimport { QuizService } from '../../core/services/[1;31mquiz[m.service';
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m81[m[36m:[m  private [1;31mquiz[mService = inject(QuizService);
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m165[m[36m:[m  [1;31mquiz[mTitulo = '';
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m166[m[36m:[m  [1;31mquiz[mNotaMinima = 7;
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m488[m[36m:[m      titulo: this.[1;31mquiz[mTitulo.trim() || 'Avaliação de Conhecimento Regulamentar',
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m489[m[36m:[m      notaMinima: Number(this.[1;31mquiz[mNotaMinima || 7),
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m493[m[36m:[m    this.[1;31mquiz[mService.criarQuizCompleto(payloadBackend).subscribe({
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m497[m[36m:[m        this.[1;31mquiz[mTitulo = '';
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m507[m[36m:[m        console.error('Erro ao salvar [1;31mquiz[m no NestJS:', err);
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m667[m[36m:[m          // Concatena ou substitui o array reativo do seu [1;31mquiz[m com as perguntas cuspidas pela IA
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m705[m[36m:[m      titulo: this.[1;31mquiz[mTitulo.trim() || `Avaliação de Conformidade Regulamentar`,
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m706[m[36m:[m      notaMinima: Number(this.[1;31mquiz[mNotaMinima || 7),
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m712[m[36m:[m    this.[1;31mquiz[mService.salvarQuizGeradoPorIA(payloadFinal).subscribe({
[35msrc/app/features/admin-dashboard/admin-dashboard.component.ts[m[36m:[m[32m717[m[36m:[m        this.[1;31mquiz[mTitulo = '';
[35msrc/app/features/curso-player/curso-player.component.html[m[36m:[m[32m78[m[36m:[m      <div class="status-[1;31mquiz[m-box" style="transition: all 0.4s ease;">
[35msrc/app/features/curso-player/curso-player.component.html[m[36m:[m[32m101[m[36m:[m          <button [routerLink]="['/dashboard/[1;31mquiz[m/aula', aulaAtiva?.id]"
[35msrc/app/features/curso-player/curso-player.component.html[m[36m:[m[32m123[m[36m:[m        <button mat-raised-button [routerLink]="['/dashboard/[1;31mquiz[m/aula', aulaAtiva?.id]"
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m1[m[36m:[m.[1;31mquiz[m-toolbar {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m5[m[36m:[m.[1;31mquiz[m-container {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m12[m[36m:[m.[1;31mquiz[m-footer-actions {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m21[m[36m:[m.[1;31mquiz[m-footer-actions {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m28[m[36m:[m.submit-[1;31mquiz[m-btn {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m37[m[36m:[m.submit-[1;31mquiz[m-btn:not([disabled]) {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m43[m[36m:[m.submit-[1;31mquiz[m-btn[disabled] {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m58[m[36m:[m.[1;31mquiz[m-option-row {
[35msrc/app/features/quiz/quiz.component.css[m[36m:[m[32m63[m[36m:[m.[1;31mquiz[m-option-row:hover {
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m20[m[36m:[m<div class="[1;31mquiz[m-container"
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m22[m[36m:[m  <div [style.display]="(!isLoading && [1;31mquiz[m && !foiEnviado) ? 'block' : 'none'">
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m26[m[36m:[m        {{ [1;31mquiz[m?.titulo }}</h2>
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m27[m[36m:[m      <p style="color: #666666; font-size: 14px; margin: 0;">Nota mínima para aprovação: <strong>{{ [1;31mquiz[m?.nota_minima
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m31[m[36m:[m      @if ([1;31mquiz[m && [1;31mquiz[m.perguntas) {
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m32[m[36m:[m      @for (pergunta of [1;31mquiz[m.perguntas; track pergunta.id; let i = $index) {
[35msrc/app/features/quiz/quiz.component.html[m[36m:[m[32m47[m[36m:[m            <mat-radio-button class="[1;31mquiz[m-option-row" style="font-size: 13px; color: #334155; width: 100%;"
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m16[m[36m:[mimport { QuizService } from '../../core/services/[1;31mquiz[m.service';
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m20[m[36m:[m  selector: 'app-[1;31mquiz[m',
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m32[m[36m:[m  templateUrl: './[1;31mquiz[m.component.html',
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m33[m[36m:[m  styleUrl: './[1;31mquiz[m.component.css'
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m36[m[36m:[m  private [1;31mquiz[mService = inject(QuizService);
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m42[m[36m:[m  [1;31mquiz[m: any = null;
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m64[m[36m:[m    this.[1;31mquiz[mService.obterQuizPorAula(this.aulaId).subscribe({
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m67[m[36m:[m          this.[1;31mquiz[m = dados[0] || null;
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m69[m[36m:[m          this.[1;31mquiz[m = dados;
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m72[m[36m:[m        console.log('Quiz carregado com sucesso:', this.[1;31mquiz[m);
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m75[m[36m:[m        console.error('Erro detalhado ao buscar o [1;31mquiz[m:', err);
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m86[m[36m:[m    if (!this.[1;31mquiz[m || !this.[1;31mquiz[m.perguntas || !Array.isArray(this.[1;31mquiz[m.perguntas) || this.[1;31mquiz[m.perguntas.length === 0) {
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m90[m[36m:[m    return totalRespondidas === this.[1;31mquiz[m.perguntas.length;
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m94[m[36m:[m    if (!this.[1;31mquiz[m || !this.[1;31mquiz[m.id) {
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m113[m[36m:[m    this.[1;31mquiz[mService.enviarRespostas(this.[1;31mquiz[m.id, payloadCompleto).subscribe({
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m133[m[36m:[m        console.error('Erro ao processar correção do [1;31mquiz[m:', err);
[35msrc/app/features/quiz/quiz.component.ts[m[36m:[m[32m143[m[36m:[m    const treinamentoId = this.[1;31mquiz[m?.aula?.modulo?.treinamento_id || 4;
